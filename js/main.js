/* Il Sentiero del Cuore Rosa — per Trudy */
(() => {
  "use strict";

  /* ───────── sempre riparti dall'alto + schermata di benvenuto ───────── */
  if ("scrollRestoration" in history) {
    history.scrollRestoration = "manual";
  }
  function resetToTop() {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }
  resetToTop();
  // bfcache / refresh: forza di nuovo l'inizio
  window.addEventListener("pageshow", (e) => {
    resetToTop();
    // se torni da cache con il sito già "aperto", ricarica per rivedere il gate
    if (e.persisted && document.body.classList.contains("entered")) {
      location.reload();
    }
  });
  window.addEventListener("load", resetToTop);

  const RM = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, c) => (c || document).querySelector(s);

  /* ───────── cuori 3D: no flash poster, solo quando il GLB è pronto ───────── */
  document.querySelectorAll(".heart-model").forEach((mv) => {
    if (RM) mv.removeAttribute("auto-rotate");

    const revealHeart = () => {
      try {
        if (typeof mv.dismissPoster === "function") mv.dismissPoster();
      } catch (_) {}
      mv.classList.add("is-ready");
      const glow = mv.parentElement && mv.parentElement.querySelector(".ph-glow");
      if (glow) glow.classList.add("is-on");
    };

    if (mv.loaded) {
      revealHeart();
    } else {
      mv.addEventListener("load", revealHeart, { once: true });
      // fallback se load non scatta (errore / timeout)
      setTimeout(() => {
        if (!mv.classList.contains("is-ready") && mv.loaded) revealHeart();
      }, 4000);
    }
  });

  /* ───────── cancello ───────── */
  const gate = $("#gate");
  const gateBtn = $("#gateBtn");
  document.body.classList.add("locked");

  let gateGone = false;
  function revealHero() {
    document.querySelectorAll(".hero .reveal").forEach((el) => el.classList.add("in"));
  }
  function leaveGate() {
    if (gateGone) return;
    gateGone = true;

    // riparti sempre dalla hero al momento dell'ingresso
    resetToTop();

    gate.classList.add("leave");
    document.body.classList.add("entered");
    document.body.classList.remove("locked");

    // blur soft sul bottone per non lasciare focus ring blu
    if (gateBtn && typeof gateBtn.blur === "function") gateBtn.blur();

    // svela l'hero mentre il cancello si dissolve
    setTimeout(revealHero, RM ? 40 : 180);

    const hideMs = RM ? 220 : 1200;
    setTimeout(() => { gate.hidden = true; }, hideMs);

    // petali dopo un attimo, sincronizzati con l'apertura
    setTimeout(startPetals, RM ? 0 : 280);
  }

  gateBtn.addEventListener("click", (e) => {
    e.preventDefault();
    leaveGate();
    // rimuove focus immediato (outline/tap highlight di sistema)
    requestAnimationFrame(() => gateBtn.blur());
  });
  window.addEventListener("keydown", (e) => {
    if (!gateGone && (e.key === "Enter" || e.key === " " || e.key === "ArrowDown")) {
      e.preventDefault();
      leaveGate();
    }
  });

  /* ───────── reveal on scroll ───────── */
  const revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !RM) {
    const io = new IntersectionObserver((entries) => {
      for (const en of entries) {
        if (en.isIntersecting) {
          en.target.classList.add("in");
          io.unobserve(en.target);
        }
      }
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    // l'hero viene svelato all'ingresso dal cancello; gli altri restano sull'IO
    revealEls.forEach((el) => {
      if (!el.closest(".hero")) io.observe(el);
    });
  } else {
    revealEls.forEach((el) => el.classList.add("in"));
  }

  /* ───────── progresso sentiero ───────── */
  const trailFill = $("#trailFill");
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      trailFill.style.transform = `scaleX(${max > 0 ? Math.min(window.scrollY / max, 1) : 0})`;
      ticking = false;
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ───────── tilt copertina (solo pointer fine) ───────── */
  const tilt = $("#heroTilt");
  if (tilt && !RM && window.matchMedia("(pointer: fine)").matches) {
    const box = $("#heroBook");
    box.addEventListener("pointermove", (e) => {
      const r = box.getBoundingClientRect();
      const dx = (e.clientX - r.left) / r.width - 0.5;
      const dy = (e.clientY - r.top) / r.height - 0.5;
      tilt.style.transform = `perspective(900px) rotateY(${dx * 10}deg) rotateX(${dy * -10}deg)`;
      tilt.style.setProperty("--shine", String(0.1 + Math.abs(dx) * 0.25));
    });
    box.addEventListener("pointerleave", () => {
      tilt.style.transform = "perspective(900px) rotateY(0deg) rotateX(0deg)";
      tilt.style.setProperty("--shine", "0.12");
    });
  }

  /* ───────── petali ───────── */
  const canvas = $("#petals");
  let petalsOn = false;
  function startPetals() {
    if (petalsOn || RM || !canvas.getContext) return;
    petalsOn = true;

    const ctx = canvas.getContext("2d");
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    let W, H, petals = [];
    const COLORS = ["#f6c9cf", "#f3b7c4", "#fde9e4", "#f0a8bb", "#ffd9cc"];

    function resize() {
      W = canvas.width = Math.round(innerWidth * DPR);
      H = canvas.height = Math.round(innerHeight * DPR);
      canvas.style.width = innerWidth + "px";
      canvas.style.height = innerHeight + "px";
    }
    resize();
    window.addEventListener("resize", resize);

    const N = innerWidth < 640 ? 11 : 17;
    function mk(fromTop) {
      return {
        x: Math.random() * W,
        y: fromTop ? -30 * DPR : Math.random() * H,
        s: (7 + Math.random() * 8) * DPR,
        vy: (0.35 + Math.random() * 0.55) * DPR,
        ph: Math.random() * Math.PI * 2,
        sway: (0.35 + Math.random() * 0.5) * DPR,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.02,
        c: COLORS[(Math.random() * COLORS.length) | 0],
        a: 0.5 + Math.random() * 0.35,
      };
    }
    for (let i = 0; i < N; i++) petals.push(mk(false));

    function drawPetal(p) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = p.a;
      ctx.fillStyle = p.c;
      ctx.beginPath();
      ctx.moveTo(0, -p.s * 0.55);
      ctx.bezierCurveTo(p.s * 0.6, -p.s * 0.5, p.s * 0.55, p.s * 0.4, 0, p.s * 0.6);
      ctx.bezierCurveTo(-p.s * 0.55, p.s * 0.4, -p.s * 0.6, -p.s * 0.5, 0, -p.s * 0.55);
      ctx.fill();
      ctx.restore();
    }

    let raf = null;
    function frame() {
      ctx.clearRect(0, 0, W, H);
      for (let i = 0; i < petals.length; i++) {
        const p = petals[i];
        p.ph += 0.012;
        p.x += Math.sin(p.ph) * p.sway;
        p.y += p.vy;
        p.rot += p.vr;
        if (p.y > H + 40 * DPR) petals[i] = mk(true);
        drawPetal(p);
      }
      raf = requestAnimationFrame(frame);
    }
    frame();

    document.addEventListener("visibilitychange", () => {
      if (document.hidden || readerOpenFlag) {
        if (raf) { cancelAnimationFrame(raf); raf = null; }
      } else if (!raf) frame();
    });
    window.__petalsPause = () => { if (raf) { cancelAnimationFrame(raf); raf = null; } };
    window.__petalsResume = () => { if (!raf && !document.hidden) frame(); };
  }

  /* ───────── la fioritura scroll-driven (apertura → zoom → fade, con rewind) ─────────
     Timeline su progress p ∈ [0,1], tutto lineare e reversibile:
       0      → P_BLOOM_END : apertura bocciolo (animazione GLB)
       P_BLOOM → P_ZOOM_END : zoom nella corolla (stessa “velocità” di scroll)
       P_ZOOM  → 1          : dissolvenza elegante del tulipano
     Scroll indietro = rewind perfetto (stesse funzioni, nessuna transition CSS).
  */
  const bloomMv = $("#bloomViewer");
  const bloomSec = document.querySelector(".bloom-journey");
  if (bloomMv && bloomSec) {
    const bloomSticky = bloomSec.querySelector(".bloom-sticky");
    const bloomStage = $("#bloomStage") || bloomSticky;
    const line1 = document.querySelector(".bloom-line-1");
    const line2 = document.querySelector(".bloom-line-2");

    // quote di scroll: zoom non più compresso nell'ultimo sesto
    const P_BLOOM_END = 0.46;
    const P_ZOOM_END = 0.78;
    const ORBIT_START_REFERENCE = 140;
    const ORBIT_END_REFERENCE = 46;

    let dur = 0;
    let ready = false;
    let visible = false;
    let raf = null;
    let lastP = -1;
    let lastOrbit = -1;
    let lastTime = -1;
    let lastVis = -1;
    let lastScale = -1;
    let lastL1 = -1;
    let lastL2 = -1;
    let orbitStart = ORBIT_START_REFERENCE;
    let orbitEnd = ORBIT_END_REFERENCE;

    const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
    // leggero ease solo in entrata/uscita fase (mantiene sensazione lineare al centro)
    const easeInOut = (t) => {
      t = clamp01(t);
      return t * t * (3 - 2 * t);
    };

    function progress() {
      const r = bloomSec.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      if (total <= 0) return 0;
      const p = -r.top / total;
      return p < 0 ? 0 : p > 1 ? 1 : p;
    }

    function setBloomTime(open01) {
      if (!ready || !dur) return;
      // un solo frame prima della fine: il GLB a duration esatta torna a 0
      const t = Math.min(open01 * dur, Math.max(0, dur - 1 / 120));
      if (Math.abs(t - lastTime) < 0.0008) return;
      lastTime = t;
      bloomMv.currentTime = t;
    }

    function setBloomCamera(zoom01) {
      if (!ready) return;
      const radius = orbitStart + (orbitEnd - orbitStart) * clamp01(zoom01);
      if (Math.abs(radius - lastOrbit) < 0.015) return;
      lastOrbit = radius;
      bloomMv.cameraOrbit = `0deg 75deg ${radius.toFixed(2)}%`;
      // salto immediato: niente interpolazione camera (evita lag e “scatti” in rewind)
      if (typeof bloomMv.jumpCameraToGoal === "function") bloomMv.jumpCameraToGoal();
    }

    function setBloomVisibility(vis01, scale) {
      if (Math.abs(vis01 - lastVis) > 0.004) {
        lastVis = vis01;
        bloomSticky.style.setProperty("--bloom-vis", vis01.toFixed(4));
      }
      if (Math.abs(scale - lastScale) > 0.002) {
        lastScale = scale;
        bloomSticky.style.setProperty("--bloom-scale", scale.toFixed(4));
      }
    }

    function setCaption(el, show01, cacheKey) {
      if (!el) return;
      const o = clamp01(show01);
      const prev = cacheKey === 1 ? lastL1 : lastL2;
      if (Math.abs(o - prev) < 0.015) return;
      if (cacheKey === 1) lastL1 = o; else lastL2 = o;
      el.style.opacity = o.toFixed(3);
      // niente translate: resta ancorata in alto/basso, stabile nel viewport
    }

    function syncBloomCameraRange() {
      const bounds = bloomMv.getBoundingClientRect();
      const canvasSize = Math.min(bounds.width, bounds.height) || 1;
      const referenceSize = Math.min(innerWidth * 0.9, innerHeight * 0.62, 520);
      const scale = canvasSize / Math.max(referenceSize, 1);
      orbitStart = ORBIT_START_REFERENCE * scale;
      orbitEnd = ORBIT_END_REFERENCE * scale;
      lastOrbit = -1;
    }

    function applyProgress(p) {
      // ── fase 1: apertura bocciolo ──
      const openP = clamp01(p / P_BLOOM_END);

      // ── fase 2: zoom (stessa linearità dello scroll; parte solo a fiore aperto) ──
      const zoomP = p <= P_BLOOM_END
        ? 0
        : clamp01((p - P_BLOOM_END) / (P_ZOOM_END - P_BLOOM_END));

      // ── fase 3: dissolvenza dopo lo zoom ──
      const fadeP = p <= P_ZOOM_END
        ? 0
        : clamp01((p - P_ZOOM_END) / (1 - P_ZOOM_END));
      // ease solo sulla coda della fade (elegante, ma ancora legata allo scroll)
      const fadeEased = easeInOut(fadeP);
      const vis = 1 - fadeEased;
      // leggero avvicinamento mentre dissolve (non zoom camera: già finito)
      const sc = 1 + fadeEased * 0.07;

      if (ready && !RM) {
        setBloomTime(openP);
        setBloomCamera(zoomP);
      } else if (ready && RM) {
        setBloomTime(1);
        setBloomCamera(0);
      }
      setBloomVisibility(RM ? 1 : vis, RM ? 1 : sc);

      /*
        Didascalie FUORI dallo stage (non sul fiore):
        - restano stabili e leggibili finché l'animazione è attiva nel viewport
        - spariscono solo con la dissolvenza finale del tulipano
        - in rewind ricompaiono insieme all'animazione
      */
      if (!RM) {
        // entrata dolce nei primi istanti, poi piena finché il fiore non dissolve
        const enter = p < 0.02 ? clamp01(p / 0.02) : 1;
        // line1: guida "scorri piano" — stabile per tutta l'apertura e lo zoom
        const cap1 = enter * vis;
        // line2: compare a fiore quasi aperto, resta fino alla fade (sempre sotto, non sul fiore)
        const cap2Enter = openP < 0.78 ? 0
          : openP < 0.95 ? clamp01((openP - 0.78) / 0.17)
          : 1;
        const cap2 = cap2Enter * vis;
        setCaption(line1, cap1, 1);
        setCaption(line2, cap2, 2);
      } else {
        setCaption(line1, 0, 1);
        setCaption(line2, 0, 2);
      }

      // risparmio GPU quando il fiore è completamente dissolto
      if (bloomStage) {
        bloomStage.style.visibility = vis < 0.01 ? "hidden" : "visible";
      }
    }

    function update() {
      const p = progress();
      // aggiorna solo se lo scroll è cambiato in modo percepibile (fps stabili)
      if (Math.abs(p - lastP) > 0.00035) {
        lastP = p;
        applyProgress(p);
      }
      raf = visible ? requestAnimationFrame(update) : null;
    }

    bloomMv.addEventListener("load", () => {
      ready = true;
      bloomMv.animationName = "Bloom";
      bloomMv.pause();
      dur = bloomMv.duration || 4;
      // nessuna interpolazione interna: il tempo lo dettiamo noi
      try { bloomMv.animationCrossfadeDuration = 0; } catch (_) {}
      syncBloomCameraRange();
      lastP = -1;
      applyProgress(progress());
    });

    const bio = new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
      if (visible) {
        if (!raf) raf = requestAnimationFrame(update);
        // riallinea al rientro in viewport (anche da sotto, in rewind)
        lastP = -1;
      } else {
        if (raf) { cancelAnimationFrame(raf); raf = null; }
        try { bloomMv.pause(); } catch (_) {}
      }
    }, { rootMargin: "20% 0px" });
    bio.observe(bloomSec);

    window.addEventListener("resize", () => {
      syncBloomCameraRange();
      lastP = -1;
      if (ready) applyProgress(progress());
    }, { passive: true });

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        if (raf) { cancelAnimationFrame(raf); raf = null; }
      } else if (visible && !raf) {
        lastP = -1;
        raf = requestAnimationFrame(update);
      }
    });
  }

  /* ───────── mazzo di carte ─────────
     Il salto verso l'alto SOLO trascinando a destra era causato da:
     1) transform della card che espandeva lo scrollWidth del document (lato +X)
     2) un loop di window.scrollTo che combatteva scroll-behavior:smooth
     Freeze con body position:fixed + overflow clip sul deck, senza scrollTo a loop.
  */
  const stack = $("#deckStack");
  if (stack) {
    const cards = Array.from(stack.querySelectorAll(".card"));
    const dots = Array.from(document.querySelectorAll("#deckDots i"));
    const POSE = [
      [0, 0, 0],
      [-3.4, -7, 5],
      [2.6, 8, 9],
      [-1.6, -3, 13],
    ];
    let order = cards.slice();
    let drag = null;
    let lockY = 0;
    let freezeCount = 0;

    function layout() {
      order.forEach((card, i) => {
        const p = POSE[i] || POSE[POSE.length - 1];
        card.style.setProperty("--rot", (i === 0 ? 0 : p[0]) + "deg");
        card.style.setProperty("--tx", (i === 0 ? 0 : p[1]) + "px");
        card.style.setProperty("--ty", (i === 0 ? 0 : p[2]) + "px");
        card.style.setProperty("--sc", String(1 - i * 0.035));
        card.style.zIndex = String(cards.length - i);
      });
      const topIdx = cards.indexOf(order[0]);
      dots.forEach((d, i) => d.classList.toggle("on", i === topIdx));
    }
    layout();

    function cycle() {
      const top = order.shift();
      order.push(top);
      top.classList.remove("flipped");
      layout();
    }

    function freezePage() {
      if (freezeCount++ > 0) return;
      lockY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
      document.documentElement.classList.add("deck-dragging");
      document.body.classList.add("deck-dragging");
      document.body.style.top = `-${lockY}px`;
    }

    function unfreezePage() {
      if (freezeCount === 0) return;
      freezeCount = Math.max(0, freezeCount - 1);
      if (freezeCount > 0) return;
      document.documentElement.classList.remove("deck-dragging");
      document.body.classList.remove("deck-dragging");
      document.body.style.top = "";
      // restore istantaneo (mai smooth: evita scatti)
      const prev = document.documentElement.style.scrollBehavior;
      document.documentElement.style.scrollBehavior = "auto";
      window.scrollTo(0, lockY);
      document.documentElement.style.scrollBehavior = prev;
    }

    function onPointerDown(e) {
      const top = order[0];
      if (!top || !top.contains(e.target) || drag) return;
      // solo tasto primario / touch / pen
      if (e.pointerType === "mouse" && e.button !== 0) return;

      // evita focus + scroll-into-view del browser
      e.preventDefault();
      if (document.activeElement && document.activeElement !== document.body) {
        try { document.activeElement.blur(); } catch (_) {}
      }

      drag = {
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        t: performance.now(),
        moved: false,
        card: top,
      };

      // NON usare setPointerCapture: su alcuni browser, quando la card
      // si sposta a destra, prova a tenere il target in view → scroll verso l'alto
      top.classList.add("dragging");
      freezePage();
    }

    function onPointerMove(e) {
      if (!drag || e.pointerId !== drag.id) return;
      // stop di eventuali gesture di scroll nativo
      if (e.cancelable) e.preventDefault();

      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) > 5) drag.moved = true;

      const card = drag.card;
      card.style.setProperty("--tx", dx + "px");
      card.style.setProperty("--ty", dy + "px");
      card.style.setProperty("--rot", (dx * 0.07) + "deg");
    }

    function onPointerUp(e) {
      if (!drag || (e && e.pointerId != null && e.pointerId !== drag.id)) return;

      const card = drag.card;
      const dx = (e && e.clientX != null ? e.clientX : drag.x) - drag.x;
      const dy = (e && e.clientY != null ? e.clientY : drag.y) - drag.y;
      const dist = Math.hypot(dx, dy);
      const quick = performance.now() - drag.t < 300;
      card.classList.remove("dragging");

      if (!drag.moved) {
        card.classList.toggle("flipped");
        card.style.setProperty("--tx", "0px");
        card.style.setProperty("--ty", "0px");
        card.style.setProperty("--rot", "0deg");
        drag = null;
        unfreezePage();
      } else if (dist > 80 || (quick && dist > 40)) {
        const k = 1.6 + Math.random() * 0.3;
        card.classList.add("leaving");
        card.style.setProperty("--tx", dx * k + "px");
        card.style.setProperty("--ty", dy * k + "px");
        card.style.setProperty("--rot", (dx * 0.12) + "deg");
        // tieni la pagina freezata finché la card non rientra nel mazzo
        const leaving = card;
        drag = null;
        setTimeout(() => {
          leaving.classList.remove("leaving");
          cycle();
          unfreezePage();
        }, 340);
      } else {
        drag = null;
        layout();
        unfreezePage();
      }
    }

    // listener non-passive sul mazzo: possiamo preventDefault su touch/pointer
    stack.addEventListener("pointerdown", onPointerDown, { passive: false });
    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", onPointerUp, { passive: false });
    window.addEventListener("pointercancel", onPointerUp, { passive: false });

    // iOS/Safari: blocca lo scroll nativo mentre si trascina
    window.addEventListener("touchmove", (e) => {
      if (drag && e.cancelable) e.preventDefault();
    }, { passive: false });

    window.addEventListener("blur", () => {
      if (drag) onPointerUp({ pointerId: drag.id, clientX: drag.x, clientY: drag.y });
    });

    stack.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        cycle();
        e.preventDefault();
      } else if (e.key === "Enter" || e.key === " ") {
        order[0].classList.toggle("flipped");
        e.preventDefault();
      }
    });
  }

  /* ───────── voci degli amici ───────── */
  const voice = new Audio();
  voice.preload = "none";
  let playingBtn = null;

  function stopVoice() {
    voice.pause();
    voice.currentTime = 0;
    if (playingBtn) {
      playingBtn.classList.remove("playing");
      playingBtn = null;
    }
  }

  document.querySelectorAll(".tool-sound").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (playingBtn === btn) {
        stopVoice();
        return;
      }
      stopVoice();
      voice.src = btn.dataset.sound;
      voice.play().then(() => {
        playingBtn = btn;
        btn.classList.add("playing");
      }).catch(() => {});
    });
  });
  voice.addEventListener("ended", stopVoice);

  /* ───────── rotazione automatica dei modelli ───────── */
  document.querySelectorAll(".tool-spin").forEach((btn) => {
    btn.addEventListener("click", () => {
      const mv = btn.closest(".friend-stage").querySelector("model-viewer");
      const on = !mv.hasAttribute("auto-rotate");
      if (on) mv.setAttribute("auto-rotate", "");
      else mv.removeAttribute("auto-rotate");
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.setAttribute("aria-label", on ? "Ferma la rotazione automatica" : "Attiva la rotazione automatica");
    });
  });

  /* ───────── il lettore ───────── */
  const TOTAL = 26;
  const pages = [];
  for (let i = 1; i <= TOTAL; i++) {
    const n = String(i).padStart(2, "0");
    pages.push({ sm: `assets/pages/seq-${n}.webp`, hd: `assets/pages-hd/seq-${n}.webp` });
  }

  const reader = $("#reader");
  const readerImg = $("#readerImg");
  const readerCount = $("#readerCount");
  const readerFill = $("#readerProgressFill");
  const btnPrev = $("#readerPrev");
  const btnNext = $("#readerNext");
  const btnClose = $("#readerClose");
  const btnZoom = $("#readerZoom");
  const openBtn = $("#openReader");
  const stage = $("#readerStage");

  let current = 0;
  let readerOpenFlag = false;
  let lastFocus = null;

  function pick(i) {
    const dispW = Math.min(innerWidth * 0.94, (innerHeight - 150) * 0.667);
    const need = dispW * Math.min(window.devicePixelRatio || 1, 3);
    return need > 780 ? pages[i].hd : pages[i].sm;
  }

  function preload(i) {
    if (i < 0 || i >= TOTAL) return;
    const im = new Image();
    im.src = pick(i);
  }

  function show(i, dir) {
    current = Math.max(0, Math.min(TOTAL - 1, i));
    reader.classList.add("loading");
    readerImg.classList.remove("turn");
    readerImg.style.setProperty("--dir", dir >= 0 ? "1" : "-1");

    const src = pick(current);
    const im = new Image();
    im.onload = () => {
      readerImg.src = src;
      reader.classList.remove("loading");
      void readerImg.offsetWidth;
      readerImg.classList.add("turn");
      preload(current + 1);
      preload(current - 1);
    };
    im.onerror = () => reader.classList.remove("loading");
    im.src = src;

    readerImg.alt = `Pagina ${current + 1} di ${TOTAL} — Il Sentiero del Cuore Rosa`;
    readerCount.textContent = `${current + 1} / ${TOTAL}`;
    readerFill.style.width = `${((current + 1) / TOTAL) * 100}%`;
    btnPrev.disabled = current === 0;
    btnNext.disabled = current === TOTAL - 1;
    try { sessionStorage.setItem("trudy-page", String(current)); } catch (e) {}
  }

  function openReader() {
    stopVoice();
    lastFocus = document.activeElement;
    reader.hidden = false;
    readerOpenFlag = true;
    document.body.classList.add("locked");
    if (window.__petalsPause) window.__petalsPause();
    requestAnimationFrame(() => reader.classList.add("open"));
    let start = 0;
    try { start = parseInt(sessionStorage.getItem("trudy-page") || "0", 10) || 0; } catch (e) {}
    show(start, 1);
    btnClose.focus();
  }

  function closeReader() {
    reader.classList.remove("open");
    readerOpenFlag = false;
    document.body.classList.remove("locked");
    if (window.__petalsResume) window.__petalsResume();
    setTimeout(() => { reader.hidden = true; }, 480);
    if (lastFocus) lastFocus.focus();
  }

  openBtn.addEventListener("click", openReader);
  btnClose.addEventListener("click", closeReader);
  btnPrev.addEventListener("click", () => show(current - 1, -1));
  btnNext.addEventListener("click", () => show(current + 1, 1));

  btnZoom.addEventListener("click", () => {
    const z = reader.classList.toggle("zoomed");
    btnZoom.setAttribute("aria-pressed", z ? "true" : "false");
    btnZoom.setAttribute("aria-label", z ? "Riduci la pagina" : "Ingrandisci la pagina");
  });

  window.addEventListener("keydown", (e) => {
    if (!readerOpenFlag) return;
    if (e.key === "Escape") closeReader();
    else if (e.key === "ArrowRight") show(current + 1, 1);
    else if (e.key === "ArrowLeft") show(current - 1, -1);
    else if (e.key === "Tab") {
      const focusables = reader.querySelectorAll("button:not([disabled]), a[href]");
      const list = Array.from(focusables);
      const first = list[0], last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
      else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
    }
  });

  /* swipe */
  let sx = 0, sy = 0, swiping = false;
  stage.addEventListener("pointerdown", (e) => {
    if (reader.classList.contains("zoomed")) return;
    sx = e.clientX; sy = e.clientY; swiping = true;
  }, { passive: true });
  stage.addEventListener("pointerup", (e) => {
    if (!swiping) return;
    swiping = false;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.abs(dx) > 42 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      if (dx < 0) show(current + 1, 1); else show(current - 1, -1);
    }
  }, { passive: true });
})();
