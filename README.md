# Il Sentiero del Cuore Rosa — sito per Trudy

Esperienza web narrativa che presenta il book illustrato *Il Sentiero del Cuore Rosa*.
Sito statico: nessuna build, nessuna dipendenza. Basta servire la cartella.

## Struttura

```
index.html            pagina unica (cancello → atti → lettore)
css/style.css         stile completo, mobile-first
js/main.js            cancello, reveal, petali, tilt, voci 3D, lettore
js/vendor/model-viewer.min.js   web component <model-viewer> (self-hosted)
assets/
  cover.webp          copertina (hero)
  word-*.webp         tavole citate nell'atto secondo
  footer-path.webp    panorama originale del sentiero
  footer-path-extended.webp  versione estesa fino al bordo inferiore del footer
  mesh-3d/*.glb       4 personaggi + cuore (~1 MB l'uno) e fiore animato (~6,2 MB)
  suoni-animali/*.m4a voci dei personaggi (normalizzate)
  pages/seq-*.webp    26 pagine del libro, 720px (lettore, mobile)
  pages-hd/seq-*.webp 26 pagine del libro, 1200px (lettore, schermi grandi)
  il-sentiero-del-cuore-rosa.pdf   PDF compresso per il web (~8,5 MB, 150dpi)
```

GLB originali di Meshy (53–56 MB l'uno) spostati in
`~/Documents/book-cami/mesh-3d-originali/` per non appesantire il deploy.
Ottimizzazione usata (draco + texture webp 1536px + semplificazione al 12%):

```sh
npx @gltf-transform/cli optimize IN.glb OUT.glb \
  --compress draco --texture-compress webp --texture-size 1536 \
  --simplify true --simplify-ratio 0.12 --simplify-error 0.01
```

Nota: il decoder Draco è self-hosted in `js/vendor/draco/` (niente dipendenza
da gstatic/CDN Google), così i modelli 3D funzionano anche su reti mobile
restrittive.

Le pagine bianche interne (2 e 27) sono escluse dal lettore ma restano nel PDF.

## Anteprima locale

```sh
python3 -m http.server 5173
# → http://localhost:5173
```

## Pubblicazione

Qualsiasi hosting statico va bene (Netlify, Vercel, Cloudflare Pages, GitHub Pages):
trascina la cartella o collegala — nessun comando di build, output = radice del progetto.

Poi genera il QR code puntando all'URL pubblico (il sito è pensato per essere
aperto da smartphone: il percorso parte dal "cancello" e finisce sul libro).

## Rigenerare gli asset dal PDF sorgente

Sorgente: `~/Documents/book-cami/output/pdf/Il_sentiero_del_cuore_rosa_COMPLETO_8x12_300dpi.pdf`

```sh
# pagine del lettore
pdftoppm -png -r 150 SORGENTE.pdf p        # 1200×1800 px
cwebp -q 80 -resize 720 0 p-01.png -o assets/pages/seq-01.webp
cwebp -q 82 p-01.png -o assets/pages-hd/seq-01.webp

# PDF web
gs -sDEVICE=pdfwrite -dPDFSETTINGS=/ebook -dColorImageResolution=150 \
   -dJPEGQ=82 -dNOPAUSE -dQUIET -dBATCH \
   -sOutputFile=assets/il-sentiero-del-cuore-rosa.pdf SORGENTE.pdf
```
