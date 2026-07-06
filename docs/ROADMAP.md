# Roadmap de escalado — finance-app (julio → diciembre 2026)

> Objetivo central del usuario: **una app 100% fluida en rendimiento**, con base de
> ingeniería que permita escalar features sin degradarla.
>
> Cómo usar este documento: se trabaja **una fase a la vez, en orden**. Cada fase tiene
> tareas con criterios de aceptación y una sección "Cómo probar". El estado vivo
> (qué está hecho y qué sigue) se lleva en `docs/PROGRESS.md`, no aquí.

---

## Diagnóstico inicial (2026-07-06)

Stack actual: Expo SDK 54 · React Native 0.81.5 · React 19.1 · expo-router 6 · Zustand 5 ·
Supabase (auth + Postgres con RLS) · Groq (llama-3.3-70b) para el asistente · i18n propio ES/EN.

Lo que ya está bien:

- Arquitectura limpia y consistente: `services/` (lógica + Supabase), `store/` (Zustand), `components/<dominio>/`.
- RLS activado en todas las tablas; borrados masivos con doble filtro de `user_id`.
- i18n centralizado, tema oscuro coherente, Reanimated 4 + new architecture (default en SDK 54).

Deudas detectadas (ordenadas por impacto en fluidez):

1. **Refetch con spinner en cada foco de tab** — cada cambio de pestaña dispara un
   roundtrip a Supabase (`useFocusEffect` en expenses, summary, etc.). Sin caché local,
   la app "respira" spinners constantemente. Es la causa #1 de sensación de lentitud.
2. **Sin caché ni soporte offline** — sin red la app queda inutilizable; el arranque
   en frío espera a la red antes de mostrar datos.
3. **Sin medición** — no hay crash reporting ni métricas de rendimiento. No se puede
   afirmar "100% fluida" sin números antes/después.
4. **Sin tests, sin linter, sin CI** — cualquier refactor de rendimiento es a ciegas.
5. **API key de Groq embebida en el bundle** (`EXPO_PUBLIC_GROQ_API_KEY`): cualquiera
   que descompile la app puede usarla. Riesgo de costo y abuso.
6. **Listas sin virtualización real** — `TransactionList` renderiza grupos de semana
   completos (`.map` interno) y las cards no están memoizadas; con cientos de
   transacciones el scroll y cada update re-renderizan de más.
7. **Sin índices en Postgres** — `transactions` se consulta por `(user_id, month)` y
   `(user_id, category)` sin índice; hoy no duele, con 12+ meses de datos sí.
8. **Dependencias muertas**: `react-native-draggable-flatlist` y `@google/generative-ai`
   no tienen ninguna referencia en el código (se usa `react-native-reorderable-list` y `groq-sdk`).
9. **SDK 54 vs. instrucción de docs v56** — `AGENTS.md` exige leer docs de Expo v56;
   el upgrade 54→56 está planificado en Fase 2.

---

## Presupuesto de rendimiento (definición de "100% fluida")

Estos números se miden en **build de release en dispositivo físico Android de gama media**
(el peor caso realista). Se establece la línea base en Fase 1 y se re-mide al cierre de
cada fase. Una fase no se cierra si introduce una regresión.

| Métrica | Objetivo |
|---|---|
| Arranque en frío → pantalla Resumen interactiva | < 2.5 s |
| Cambio de tab (datos ya cacheados) | contenido visible inmediato, **cero spinners de pantalla completa** tras la primera carga |
| Scroll en lista de gastos con 500+ transacciones | 60 fps sostenidos, sin saltos perceptibles |
| Alta/edición/borrado de gasto | reflejo en UI inmediato (optimista), confirmación en background |
| Apertura del formulario de gasto | < 200 ms |
| Primer token del asistente IA | < 1.5 s tras enviar |
| Sesiones sin crash (Sentry) | > 99.5% |

---

## Fase 1 (Mes 1, julio 2026) — Base de ingeniería y medición

**Por qué primero:** no se puede optimizar lo que no se mide, ni refactorizar sin red de
seguridad. Todo lo demás depende de esta fase.

### Tareas

1. **Limpieza de dependencias**
   - Quitar `react-native-draggable-flatlist` y `@google/generative-ai` de package.json.
   - Renombrar `services/ai/gemini.ts` → `services/ai/chat.ts` (ya no es Gemini, es Groq).
   - Aceptación: `npm ls` limpio, app arranca, chat funciona.
2. **Tooling de calidad**
   - ESLint con `eslint-config-expo` + Prettier; script `npm run lint`.
   - Script `npm run typecheck` (`tsc --noEmit`); corregir los errores que aparezcan.
   - Aceptación: `npm run lint` y `npm run typecheck` pasan en limpio.
3. **Tests unitarios (Jest + jest-expo)**
   - Instalar `jest-expo`, `@testing-library/react-native`; script `npm test`.
   - Cubrir los servicios puros: `services/dates.ts`, `services/insights.ts` (agregaciones),
     `services/recurring.ts` (carry-over), el `applyFilters` de expenses (extraerlo a
     `services/filters.ts` para poder testearlo), y formateo CLP.
   - Aceptación: ≥ 20 tests significativos, `npm test` verde.
4. **CI en GitHub Actions**
   - Workflow con typecheck + lint + test en cada push/PR.
   - Aceptación: badge/checks verdes en el repo remoto.
5. **EAS + dev client**
   - `eas init`, `eas build --profile development`; instalar dev client en dispositivo físico.
   - Motivo: Expo Go no sirve para medir rendimiento real ni permite MMKV/Sentry nativos.
   - Aceptación: la app corre desde dev client en un dispositivo físico.
6. **Sentry (crashes + performance)**
   - `@sentry/react-native` con su config plugin; DSN vía env **no** `EXPO_PUBLIC_` para
     secretos (el DSN de Sentry sí puede ser público, los demás no).
   - Aceptación: un crash de prueba y una transacción de performance visibles en Sentry.
7. **Línea base de rendimiento** → crear `docs/PERF.md`
   - Build de **release** (`eas build --profile preview` o local) en dispositivo físico.
   - Medir y anotar: arranque en frío (cronómetro/Perfetto), tiempo de cambio de tab,
     fps de scroll con datos de volumen (sembrar 500+ transacciones con un script SQL),
     tiempo de apertura del form.
   - Aceptación: tabla de línea base completa en `docs/PERF.md` con fecha y dispositivo.
8. **Índices en Postgres** → crear `docs/migrations/001_indexes.sql`
   ```sql
   CREATE INDEX IF NOT EXISTS idx_tx_user_month ON transactions (user_id, month);
   CREATE INDEX IF NOT EXISTS idx_tx_user_category ON transactions (user_id, category);
   CREATE INDEX IF NOT EXISTS idx_debts_user_paid ON debts (user_id, paid);
   ```
   - Actualizar también `supabase-schema.sql` (fuente de verdad del esquema).
   - El usuario la ejecuta en el SQL Editor de Supabase (no hay CLI vinculado).

### Cómo probar la fase

- `npm run typecheck && npm run lint && npm test` en verde, CI verde.
- App instalada vía dev client en dispositivo físico, todas las pantallas funcionan.
- `docs/PERF.md` tiene la tabla base con números reales.

---

## Fase 2 (Mes 2, agosto 2026) — Upgrade a SDK 56 + capa de datos con caché

**Por qué:** el upgrade va primero (con la red de seguridad de Fase 1 recién montada y
antes de escribir más código sobre APIs viejas). La capa de datos con caché es el cambio
que más fluidez percibida aporta de todo el roadmap.

### Tareas

1. **Upgrade Expo SDK 54 → 56**
   - **Leer primero** https://docs.expo.dev/versions/v56.0.0/ y el blog de cambios de la 55 y 56.
   - `npx expo install expo@^56.0.0 --fix`, `npx expo-doctor`, revisar breaking changes
     (expo-router, Reanimated, RN). Rebuild del dev client.
   - Aceptación: expo-doctor limpio, typecheck/tests verdes, smoke test manual de las 6 tabs.
2. **TanStack Query como capa de servidor** (decisión: Query para datos remotos,
   Zustand queda solo para estado de UI: mes seleccionado, locale, config de usuario)
   - `QueryClient` con `staleTime` razonable (~30 s) y **persistencia en MMKV**
     (`react-native-mmkv` + `@tanstack/query-persist-client`): al abrir la app se pinta
     lo último conocido al instante y se revalida en background.
   - Migrar por pantallas, en este orden: expenses → summary → budget → balances.
     Claves de query por recurso y mes: `['transactions', month]`, `['overview', month]`, etc.
   - El patrón `useFocusEffect(fetch)` se reemplaza por `refetchOnWindowFocus` de Query
     (con el `focusManager` conectado a `AppState`) + invalidación por mutación.
   - Aceptación: cambiar de tab con datos cacheados **nunca** muestra spinner de pantalla
     completa; con avión activado la app muestra los últimos datos en vez de quedarse vacía.
3. **Mutaciones optimistas** para alta/edición/borrado de gastos, deudas y presupuestos:
   actualización inmediata de la caché, rollback con toast si el servidor falla.
   - Aceptación: agregar un gasto se refleja en < 1 frame percibido; en modo avión el
     rollback y su mensaje funcionan.
4. **Skeletons en vez de spinners** para la primera carga real (sin caché aún):
   placeholders con la silueta de cards/listas.
5. **Invalidaciones cruzadas**: al mutar transacciones se invalidan `overview` y
   `budget` del mes afectado (hoy ese refresco dependía del refetch-on-focus).
6. **Re-medir `docs/PERF.md`** (misma metodología de Fase 1) y anotar el antes/después.

### Cómo probar la fase

- Guion manual: abrir app sin red → ver datos; alternar las 6 tabs 10 veces → cero
  spinners; crear/editar/borrar gasto desde Gastos y desde el Chat → Resumen y
  Presupuesto reflejan el cambio al volver, sin recarga visible.
- Tests: hooks de mutación optimista con `@tanstack/react-query` test utils.

---

## Fase 3 (Mes 3, septiembre 2026) — Fluidez de UI: listas, render y arranque

### Tareas

1. **FlashList (Shopify) en las listas grandes**
   - `TransactionList`: aplanar los grupos de semana a items `{type: 'header'|'tx'|'footer'}`
     con `getItemType`, un solo nivel de virtualización (hoy cada semana renderiza todas
     sus cards de golpe).
   - Aplicar también a Saldos y Presupuesto si superan ~30 items.
   - Aceptación: scroll a 60 fps con 500+ transacciones (medido con el perf monitor del
     dev client / Perfetto), sin blank cells perceptibles.
2. **Memoización dirigida**
   - `React.memo` en `TransactionCard`, `DebtCard`, `BudgetCard`, `MessageBubble`;
     handlers estables (`useCallback`) desde las pantallas.
   - Selectores de Zustand por campo (`useStore((s) => s.x)`) en vez de desestructurar
     el store completo (hoy `expenses.tsx` se re-renderiza con cualquier cambio del store).
   - Aceptación: con React DevTools Profiler, editar 1 gasto re-renderiza solo su card
     y los totales, no la lista completa.
3. **Arranque en frío**
   - Diferir el import de `groq-sdk` al primer uso del chat (import dinámico).
   - Revisar el bundle con `npx expo export --dump-sourcemap` + source-map-explorer;
     eliminar lo que pese sin uso.
   - `app/_layout.tsx`: mostrar la UI cacheada de inmediato mientras `getSession()` resuelve
     (splash → contenido, sin ActivityIndicator intermedio si hay sesión persistida).
   - Aceptación: arranque en frío release < 2.5 s en el dispositivo de referencia.
4. **Interacciones y teclado**
   - Revisar el form de gasto (922 líneas): que abrir el modal no monte trabajo pesado
     (lazy-mount de pickers), respuesta táctil inmediata en botones (feedback < 100 ms).
   - Chat: verificar que el streaming no re-renderiza toda la lista de mensajes por token.
5. **Re-medir `docs/PERF.md`**. Con esto, el presupuesto de rendimiento completo debe
   estar **en verde**. Las fases siguientes solo deben mantenerlo.

### Cómo probar la fase

- Sembrar 1.000 transacciones en un mes de prueba; scroll arriba/abajo rápido: fluido.
- Profiler de React DevTools antes/después de la memoización (capturas en PERF.md).

---

## Fase 4 (Mes 4, octubre 2026) — Offline-first y robustez

### Tareas

1. **Cola de mutaciones offline**: con la caché persistida (Fase 2), añadir cola de
   escrituras pendientes (persistida en MMKV) que se reintenta al recuperar red
   (`onlineManager` de Query + NetInfo). Indicador discreto "pendiente de sincronizar".
   - Aceptación: registrar 3 gastos en modo avión → cerrar app → abrir con red → los 3
     aparecen en Supabase sin duplicados.
2. **Manejo de errores consistente**: un componente/toast de error único; reintentos con
   backoff en Query; estados vacíos vs. estados de error diferenciados en cada pantalla.
3. **Paginación / ventana de datos**: el historial crece sin límite. Cargar el mes activo
   completo (ya acotado) pero listas transversales (búsquedas futuras, export) por páginas.
4. **Deep links y sesión**: probar `finance-app://` en frío; refresh de token expirado sin
   deslogueo visible; pantalla de "sesión expirada" digna.
5. **Auditoría RLS + seguridad de datos**: test manual con dos cuentas (los datos de A
   jamás visibles para B, incluso vía herramientas del chat IA); revisar que ninguna
   herramienta del asistente pueda operar sin sesión.

### Cómo probar la fase

- Guion offline completo (avión on/off, kill de app a mitad de sync).
- Dos cuentas de prueba en paralelo para RLS.

---

## Fase 5 (Mes 5, noviembre 2026) — IA en backend y seguridad de claves

### Tareas

1. **Proxy de IA en Supabase Edge Functions**
   - Nueva función `chat` (Deno) que recibe mensajes + contexto, valida el JWT de
     Supabase, llama a Groq con la key **guardada como secret del servidor**, y devuelve
     el stream (SSE) al cliente.
   - El cliente (`services/ai/chat.ts`) pasa a llamar a la Edge Function; se elimina
     `EXPO_PUBLIC_GROQ_API_KEY` del proyecto y **se rota la key** en Groq.
   - Las herramientas (tools) se siguen ejecutando en el cliente (operan sobre la sesión
     del usuario); la función solo hace la inferencia. Round-trips: mantener el loop de
     tools en el cliente contra la Edge Function.
   - Aceptación: chat funciona igual (streaming incluido); no existe ninguna key de IA
     en el bundle (`npx expo export` + grep del output).
2. **Rate limiting por usuario** en la Edge Function (p. ej. N mensajes/hora) para
   proteger el costo de Groq.
3. **Historial de chat persistente** (tabla `chat_messages` con RLS): hoy el chat se
   pierde al cerrar. Cargar las últimas N con paginación hacia atrás.
4. **Biometría opcional** (`expo-local-authentication`): bloquear la app con Face ID/huella,
   activable en Ajustes. Es una app de finanzas: los usuarios lo esperan.
5. Re-medir PERF.md (el chat no debe empeorar su tiempo a primer token; objetivo < 1.5 s).

### Cómo probar la fase

- Chat completo (alta, split, borrado masivo con confirmación) contra la Edge Function.
- Intentar llamar a la función sin JWT válido → 401. Superar el rate limit → error claro en UI.

---

## Fase 6 (Mes 6, diciembre 2026) — Features de crecimiento + cierre

La app ya es rápida, robusta y segura. Este mes: 2–3 features de valor (elegir con el
usuario al llegar aquí) + cierre del ciclo.

### Candidatas (backlog priorizado — elegir 2 o 3, no todas)

- **Ingresos** (hoy solo gastos): tipo `income|expense` en transactions, balance neto
  mensual en Resumen. Es la más pedida en apps de finanzas personales.
- **Notificaciones** (`expo-notifications`): recordatorio diario de registrar gastos y
  alerta al superar el 80%/100% de un presupuesto.
- **Export CSV/Excel** del mes o del año (share sheet nativo).
- **Adjuntar boleta/foto** a un gasto (expo-image-picker + Supabase Storage con RLS).
- **Tema claro** (la infraestructura de Colors ya está centralizada).
- **Widget / Quick actions** de "agregar gasto rápido".

### Cierre del ciclo

1. **EAS Update (OTA)** configurado para enviar fixes JS sin pasar por build/store.
2. **Distribución**: si es de uso personal, builds internas (EAS internal distribution);
   si se publica, checklist de stores (íconos finales, splash, política de privacidad,
   textos de permisos, cuentas de prueba para revisión).
3. **Pass final de rendimiento**: re-correr toda la tabla de PERF.md y compararla contra
   la línea base de julio. Documentar la mejora total.
4. **Retro del roadmap**: qué quedó pendiente → sembrar el ROADMAP del siguiente semestre.

---

## Reglas transversales (aplican todo el semestre)

1. **Una fase a la vez.** No adelantar trabajo de fases futuras sin acuerdo del usuario.
2. **Medir antes y después** de cada cambio de rendimiento; los números van a `docs/PERF.md`.
3. **Nada se da por hecho sin probarse** en dispositivo (dev client) y con
   `typecheck + lint + test` en verde.
4. Todo texto de UI nuevo entra por `services/i18n.ts` en **ES y EN**.
5. Cambios de esquema: actualizar `supabase-schema.sql` + archivo nuevo en
   `docs/migrations/` + avisar al usuario para ejecutarlo en Supabase.
6. Secretos jamás en `EXPO_PUBLIC_*` (eso se compila dentro del bundle).
7. Al terminar cada sesión de trabajo: actualizar `docs/PROGRESS.md`.
