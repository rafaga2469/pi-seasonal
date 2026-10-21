# Pi Seasonal

Extensión personal de Pi: decoración de temporada para la interfaz.

## Qué hace

- **Decoración fijada arriba, a todo el ancho**: en fullscreen la línea de temporada
  queda pinned directamente debajo de la barra de Gentle Shell; se envuelve el part
  `"header"` del estado compartido de gentle-pi (símbolos globales
  `gentle-pi.experimental-sidebar.*`), que es la fila a ancho completo sobre el
  transcript. Sin gentle-pi, el fallback es `ctx.ui.setHeader()` (scrollea con la chat).
- **Comando `/seasonal`** para controlar la decoración.
- Las temporadas se resuelven del calendario (incluye fechas móviles: Carnaval
  y Semana Santa se calculan desde la Pascua con el algoritmo de Gregorio).

## Uso

| Comando | Efecto |
|---|---|
| `/seasonal` o `/seasonal status` | Temporada y modo actuales |
| `/seasonal on` / `/seasonal off` | Activar/desactivar el widget animado |
| `/seasonal overlay` | Superposición de celebración (cierra con cualquier tecla; auto a los 15 s) |
| `/seasonal holiday <id>` | Fijar una temporada manualmente, ej. `/seasonal holiday halloween` |
| `/seasonal auto` | Volver a seguir el calendario |

La preferencia persiste en `state.json` junto a esta extensión.

## Temporadas incluidas

`newyear` (27 dic–2 ene) · `navidad` (1–26 dic) · `muertos` (1–2 nov) ·
`halloween` (octubre) · `carnaval` (Semana previa al Miércoles de Ceniza) ·
`pascua` (Domingo de Ramos–Pascua) · `valentines` (8–14 feb) ·
`sanpatricio` (16–17 mar) · `trabajador` (1 may).

Arte híbrido: emojis (🕷️ 👻 🎃 🦇 🎄 🎁 ⭐ ❄️ 🎆 🎉 🎭 🐰 🥚 🌷 🍀 🌈 💀 🕯️ 🌼 🛠️)
combinados con textura ASCII (telarañas, hilo de la araña, nieve, papel picado, confeti, pasto).

## Estructura

- `calendar.ts` — definiciones de temporada y resolución por fecha (Pura).
- `canvas.ts` — motor de dibujo puro: clusters de display (emoji = 2 columnas) y `widthOf`; el
  padding a ancho exacto se hace por celda en `canvasToLines` (nunca sobre strings con ANSI).
- `scenes.ts` — arte híbrido emoji + ASCII por temporada; cada escena declara un presupuesto de emojis
  para garantizar ancho exacto (celdas + 1 columna por emoji = ancho del widget).
- `widget.ts` — componente animado compacto: una línea por tick (`season.inline`) + ciclo
  de frames; usado por el fallback de header.
- `decoration.ts` — fijado pinned: envuelve el part `"header"` del estado compartido de
  gentle-pi, añade la línea debajo de su barra y sube la revisión del cache sidebar en
  cada tick para que el layout re-renderice.
- `overlay.ts` — modo celebración a pantalla completa bajo demanda.
- `state.ts` — persistencia de preferencia (respeta `SEASONAL_STATE_PATH` para pruebas aisladas).
- `smoke.ts` — prueba de humo: anchos 20–121 × 26 frames con ancho de display exacto + fechas clave.
- `tsconfig.typecheck.json` — solo chequeo de tipos; **no** usar de `tsconfig.json`:
  los `paths` rompen la resolución runtime de jiti/tsx.

## Verificación

```bash
npx tsx extensions/seasonal/smoke.ts        # humo de escenas y calendario
pi --mode rpc --no-session < /dev/null                  # carga sin errores en runtime real
```

## Notas técnicas

- Para que las extensiones personales resuelvan `@earendil-works/pi-tui` y
  `@earendil-works/pi-coding-agent`, existe el symlink
  `~/.pi/agent/node_modules -> install/releases/<versión>/node_modules`.
  Si actualizas Pi a otra release, recrea el symlink.
- Los glifos de detalle son monocolumna (ASCII); los emojis renderizan 2 columnas: cada escena
  resta su presupuesto de emojis al ancho del canvas para que la línea mida exactamente el ancho
  del widget (`widthOf` lo verifica en el humo).