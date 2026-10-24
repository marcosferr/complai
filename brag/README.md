# Video de presentación — UNI Contratos (/brag)

Video para la Hackatón SOPAIA (Desafío 1), hecho con la interfaz real de la app.

- `v1/brag.mp4` — primera versión (49 s, 1080p30, música original sintetizada).
- `v1/brag.jpg` — póster (también es el cuadro 0 del video).
- `v1/share-copy.txt` — texto para compartir.
- `brag-plan.md` — guion y storyboard.

## Cómo se arma

1. Levantar backend (`config.settings.development`) y frontend (`npx vite --port 3000`), con Postgres y Redis.
2. Cargar datos de demo: `python manage.py shell < brag/scripts/seed.py` (usuarios y contrato ficticios)
   y `reset_demo.py` para recalcular fechas respecto de hoy.
3. Capturar el HTML real de cada pantalla: `node brag/scripts/extract.cjs` y `extract2.cjs`
   (escriben en `work/snapshots`; copiar a `brag/comp/snapshots`).
4. Servir `brag/comp/` (`python3 -m http.server 8766`) — `comp.js` reproduce cada cuadro como función pura del tiempo.
5. Revisar cuadros sueltos con `stills.cjs`, renderizar con `render.cjs <desde> <hasta>` (4 procesos en paralelo).
6. Audio: `python3 brag/audio/synth.py` (Python puro, 100 BPM, Re mayor).
7. Unir con ffmpeg (x264 CRF 16 + AAC) y reemplazar el cuadro 0 por el póster.

Los datos que aparecen son de demostración; las personas y los correos son ficticios.
