# /brag — UNI Contratos · plan

**Formato:** 1920×1080, 60 fps, 49,2 s (más largo que los 15–25 s de /brag porque se pidió mostrar
todos los puntos del Desafío 1). **Tono:** `polished` + `app-store` → institucional, preciso, con ritmo.

## Respuestas de inspección

- **Qué es:** el sistema de la UNI que convierte un contrato cargado en un tablero de seguimiento
  de obligaciones, plazos, entregables, alertas y acciones.
- **Para quién:** administradores de contratos de la Universidad Nacional de Itapúa (jurado: Hackatón SOPAIA).
- **Diferencial:** recorre exactamente la lista del Desafío 1 con la app real funcionando.
- **Afirmación más fuerte:** "1 contrato → 8 cláusulas → 11 obligaciones", con semáforo y alertas.
- **Gancho visual:** un contrato en papel con plazos resaltados → arco de ladrillo del escudo → la app.
- **UI real a mostrar:** ficha del contrato, grafo cláusula→obligación, tablero Kanban con vencimientos,
  modal con evidencia, checklist 2/4, dashboard con vencidas, evaluación de riesgo, campana de
  notificaciones, email real de vencimientos, acción "Enviar a Revisión Gerencial" con historial.
- **Caption para compartir:** ver `share-copy.txt`.

## Ángulo

La rúbrica del jurado es el guion: los 8 puntos del Desafío 1 aparecen como lista y se van tildando
uno a uno mientras la app real los resuelve. Al final, 8/8 + el "resultado esperado" citado del PDF.

## Identidad visual

- Bordó UNI `#AE152D` / `#9D2235`, ladrillo `#CC6633`, dorado `#C8860A`, papel `#F6F0E6`.
- Poppins (la de uni.edu.py); serif Source Serif 4 sólo para el contrato en papel.
- Motivo: el **arco de ladrillos del escudo** como cortina de transición (dovelas reales en ladrillo).
- Cinta tricolor del escudo como trazo bajo la marca.
- UI: HTML real extraído de la app (mismo CSS de Tailwind, mismas fuentes), animado con cámara virtual.

## Datos

Todo lo que se ve en la app es el contrato ficticio de demostración (`backend/demo/`) con personas
inventadas (Laura Benítez, Diego Ramírez, emails `@ejemplo.edu.py`). Se aclara en el cierre.

## Música

Original, sintetizada para este video. 100 BPM (1 tiempo = 0,6 s, 1 compás = 2,4 s), Re mayor.
Progresión Bm–G–D–A; cierre plagal G→D. Cada tilde de la rúbrica toca una nota de la escala de Re
mayor que asciende (D5→D6): la lista "se completa" también en el audio. Tictac de reloj en el gancho,
impacto en el arco, whooshes en cortes, todo en la grilla de corcheas.

## Storyboard (t en segundos; compás n empieza en (n−1)·2,4)

| # | t | Escena | Texto en pantalla | Punto |
|---|---|---|---|---|
| A | 0.0–4.8 | Contrato en papel en 3D; resaltador marca plazos en cada tiempo con etiquetas (10 días, 24 h, 5 días hábiles, 0,5 % por día, 12 meses) | "Un contrato." / "11 obligaciones." → "Seguimiento de forma manual." ("manual" tachado) | — |
| — | 4.2–4.8 | Arco de ladrillos sube y cubre (impacto en 4.8) | | |
| B | 4.8–7.2 | Escudo UNI + "UNI Contratos" + cinta tricolor | "Seguimiento inteligente de contratos y obligaciones" | — |
| C | 7.2–9.6 | Rúbrica: 8 puntos del Desafío 1 en dos columnas | "Lo que pide el Desafío 1" | — |
| D | 9.6–12.0 | Rúbrica colapsa en riel; entra la pantalla con la ficha del contrato | "El contrato, en una ficha." | ✓7 en 11.4 |
| E | 12.0–14.4 | Grafo real: contrato → 8 cláusulas → 11 obligaciones, aristas dibujándose en semicorcheas | "De cláusulas a obligaciones con responsable." | ✓1 en 13.8 |
| F | 14.4–16.8 | Tablero Kanban, cámara recorre las fechas de vencimiento | "Cada obligación, con su vencimiento." | ✓2 en 16.2 |
| G | 16.8–19.2 | Las 3 etiquetas reales saltan a un panel semáforo | "Normal. Atención. Crítico." | ✓8 en 18.6 |
| H | 19.2–21.6 | Modal del informe técnico con su adjunto | "Cada entrega, con su evidencia." | ✓3 en 21.0 |
| I | 21.6–24.0 | Checklist de pago 2/4 | "Lo que falta, a la vista." | ✓4 en 23.4 |
| J | 24.0–28.8 | Dashboard del responsable: vencidas 2 (rojo) / próximas 2 (ámbar) → evaluación de riesgo (Crítica · Alto) | "Lo vencido salta a la vista." / "Con impacto y riesgo evaluados." | ✓5 en 28.2 |
| K | 28.8–33.6 | Campana (4) + email real; clic en "Enviar a Revisión Gerencial" → historial | "Alertas en la app y por correo." / "Cada alerta, una acción con responsable." | ✓6 en 33.0 |
| L | 33.6–38.4 | Dashboard del administrador, contadores y próximos vencimientos | "Todo el contrato, en un tablero." | — |
| M | 38.4–43.2 | Rúbrica completa 8/8 | "Resultado esperado: un contrato cargado, convertido en una herramienta práctica de seguimiento." | 8/8 |
| N | 43.2–49.2 | Arco → cierre de marca | "UNI Contratos · Universidad Nacional de Itapúa · Hackatón SOPAIA 2026" + próximos pasos D2/D6/D8 | — |
