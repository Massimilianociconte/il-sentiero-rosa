#!/usr/bin/env python3
"""
Fix model-viewer framing: hearts/birds parked far away (8,-6,-9) inflate the
scene AABB so the camera pulls back and the flower looks tiny.

Park them inside the corolla at a microscopic scale (0.02) so bounds match
the original flower-only model.
"""
from __future__ import annotations

import json
import math
import struct
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GLB = ROOT / "assets" / "mesh-3d" / "flower_animated_web.glb"
GLB_COPY = ROOT / "assets" / "mesh-3d" / "flower_animated_web_compressed.glb"

# Old off-screen park (expands bounds)
PARK_FAR = (8.0, -6.0, -9.0)
# Inside the open corolla (matches first on-stage key of the flight clip)
PARK_IN = (0.03, 0.05, 0.08)
MICRO = 0.02
FAR_EPS = 0.25


def load_glb(path: Path):
    data = path.read_bytes()
    assert data[:4] == b"glTF", "not a GLB"
    version, length = struct.unpack_from("<II", data, 4)
    offset = 12
    json_chunk = None
    bin_chunk = None
    while offset < length:
        clen, ctype = struct.unpack_from("<I4s", data, offset)
        offset += 8
        cdata = data[offset : offset + clen]
        offset += clen
        if ctype == b"JSON":
            json_chunk = json.loads(cdata.decode("utf-8").rstrip(" \x00"))
        elif ctype == b"BIN\x00":
            bin_chunk = bytearray(cdata)
    if json_chunk is None or bin_chunk is None:
        raise RuntimeError("GLB missing JSON or BIN chunk")
    return json_chunk, bin_chunk


def write_glb(path: Path, json_chunk: dict, bin_chunk: bytes | bytearray) -> None:
    json_bytes = json.dumps(json_chunk, separators=(",", ":")).encode("utf-8")
    json_bytes += b" " * ((4 - len(json_bytes) % 4) % 4)
    bin_bytes = bytes(bin_chunk)
    bin_bytes += b"\x00" * ((4 - len(bin_bytes) % 4) % 4)
    total = 12 + 8 + len(json_bytes) + 8 + len(bin_bytes)
    out = bytearray()
    out += struct.pack("<4sII", b"glTF", 2, total)
    out += struct.pack("<I4s", len(json_bytes), b"JSON")
    out += json_bytes
    out += struct.pack("<I4s", len(bin_bytes), b"BIN\x00")
    out += bin_bytes
    path.write_bytes(out)
    print(f"wrote {path} ({len(out) / 1e6:.2f} MB)")


def is_far(v: tuple[float, float, float]) -> bool:
    return math.dist(v, PARK_FAR) < FAR_EPS


def is_unit_scale(v: tuple[float, float, float]) -> bool:
    return all(abs(c - 1.0) < 0.02 for c in v)


def accessor_view(json_chunk: dict, accessor_index: int):
    acc = json_chunk["accessors"][accessor_index]
    bv = json_chunk["bufferViews"][acc["bufferView"]]
    byte_offset = bv.get("byteOffset", 0) + acc.get("byteOffset", 0)
    count = acc["count"]
    typ = acc["type"]
    return acc, bv, byte_offset, count, typ


def patch_vec3_accessor(bin_chunk: bytearray, json_chunk: dict, accessor_index: int, patch_fn) -> int:
    acc, bv, byte_offset, count, typ = accessor_view(json_chunk, accessor_index)
    if typ != "VEC3":
        return 0
    changed = 0
    xs, ys, zs = [], [], []
    for i in range(count):
        off = byte_offset + i * 12
        x, y, z = struct.unpack_from("<fff", bin_chunk, off)
        nx, ny, nz, did = patch_fn((x, y, z), i)
        if did:
            struct.pack_into("<fff", bin_chunk, off, nx, ny, nz)
            changed += 1
            x, y, z = nx, ny, nz
        xs.append(x)
        ys.append(y)
        zs.append(z)
    # keep accessor min/max truthful for consumers that use them
    if "min" in acc:
        acc["min"] = [min(xs), min(ys), min(zs)]
    if "max" in acc:
        acc["max"] = [max(xs), max(ys), max(zs)]
    return changed


def main() -> int:
    if not GLB.exists():
        print(f"missing {GLB}", file=sys.stderr)
        return 1

    json_chunk, bin_chunk = load_glb(GLB)
    nodes = json_chunk["nodes"]
    park_names = {
        n
        for n in (
            "HEART_1",
            "HEART_2",
            "HEART_3",
            "BIRD_1",
            "BIRD_2",
            "BIRD_3",
            "Heart_1",
            "Heart_2",
            "Heart_3",
            "Bird_1",
            "Bird_2",
            "Bird_3",
        )
    }

    # 1) Rest pose: park inside the flower
    rest_fixed = 0
    for node in nodes:
        name = node.get("name") or ""
        if name not in park_names:
            continue
        if "translation" in node:
            t = tuple(node["translation"])
            if is_far(t) or True:
                node["translation"] = list(PARK_IN)
                rest_fixed += 1
        else:
            node["translation"] = list(PARK_IN)
            rest_fixed += 1
        # microscopic rest scale on the empty (mesh keeps its own local scale)
        node["scale"] = [MICRO, MICRO, MICRO]
    print(f"rest poses fixed: {rest_fixed}")

    # 2) Animation keyframes: replace far park translations; unit scales at park → micro
    # Build set of (animation, node, path) samplers
    changed_t = 0
    changed_s = 0
    for anim in json_chunk.get("animations") or []:
        # map sampler index → channels
        for ch in anim.get("channels") or []:
            node_i = ch.get("target", {}).get("node")
            path = ch.get("target", {}).get("path")
            if node_i is None or path is None:
                continue
            name = nodes[node_i].get("name") or ""
            if name not in park_names:
                continue
            samp_i = ch["sampler"]
            samp = anim["samplers"][samp_i]
            out_acc = samp["output"]
            if path == "translation":

                def patch_t(v, _i, _changed=[0]):
                    if is_far(v):
                        _changed[0] += 1
                        return (*PARK_IN, True)
                    return (*v, False)

                n = patch_vec3_accessor(bin_chunk, json_chunk, out_acc, patch_t)
                changed_t += n
            elif path == "scale":

                def patch_s(v, i, _times=None):
                    # Only the initial unit-scale keys used while parked far away.
                    # Mid-flight scales (~0.1–1) must stay intact.
                    if is_unit_scale(v):
                        return (MICRO, MICRO, MICRO, True)
                    return (*v, False)

                # Only replace unit scale when the *paired* translation at same
                # key index was a park — approximate by only rewriting keys that
                # are exactly unit AND appear before any non-unit non-zero scale
                # has begun? Safer: rewrite unit scales only in the first two
                # keys of each scale track (the known park frames).
                acc, bv, byte_offset, count, typ = accessor_view(json_chunk, out_acc)
                if typ != "VEC3":
                    continue
                xs, ys, zs = [], [], []
                for i in range(count):
                    off = byte_offset + i * 12
                    x, y, z = struct.unpack_from("<fff", bin_chunk, off)
                    # first keys are park unit-scale; later unit scales during flight stay
                    if i < 3 and is_unit_scale((x, y, z)):
                        x = y = z = MICRO
                        struct.pack_into("<fff", bin_chunk, off, x, y, z)
                        changed_s += 1
                    xs.append(x)
                    ys.append(y)
                    zs.append(z)
                if "min" in acc:
                    acc["min"] = [min(xs), min(ys), min(zs)]
                if "max" in acc:
                    acc["max"] = [max(xs), max(ys), max(zs)]

    print(f"translation keyframes patched: {changed_t}")
    print(f"scale keyframes patched: {changed_s}")

    write_glb(GLB, json_chunk, bin_chunk)
    try:
        GLB_COPY.write_bytes(GLB.read_bytes())
        print(f"mirrored {GLB_COPY.name}")
    except Exception as e:
        print(f"copy skip: {e}")

    # Verify
    j2, b2 = load_glb(GLB)
    print("verify nodes:")
    for node in j2["nodes"]:
        name = node.get("name") or ""
        if name in park_names:
            print(f"  {name} t={node.get('translation')} s={node.get('scale')}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
