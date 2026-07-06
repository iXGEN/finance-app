# PROGRESS — estado vivo del roadmap

> **Para cualquier agente (Claude u otro modelo): lee esto primero en cada sesión.**
> Aquí está qué fase está activa, qué tarea sigue y qué quedó a medias.
> Al terminar tu sesión: marca lo completado, anota lo pendiente y agrega una fila al
> registro de sesiones. El detalle de cada tarea está en `docs/ROADMAP.md`.

## Estado general

- **Fase activa:** Fase 1 — Base de ingeniería y medición
- **Siguiente tarea:** 1.5 EAS + dev client (requiere al usuario; ver "Acciones pendientes del usuario")
- **Bloqueos:** 1.5–1.7 necesitan cuenta Expo/Sentry y dispositivo físico del usuario

## Acciones pendientes del usuario (Ignacio)

1. **Ejecutar migración de índices en Supabase**: SQL Editor > pegar `docs/migrations/001_indexes.sql` > Run.
2. **Buildear dev client** (instalarlo en tu teléfono Android): `npm run build:dev` — tarda ~5 min en los servidores EAS; descarga el APK del link que te da y lo instalas.
3. **Medir línea base**: con el build de preview en el dispositivo, seguir las instrucciones de `docs/PERF.md` y llenar la tabla de "Fase 1" con los números reales.
4. Si todavía no pusheaste: `git push` para ver el CI en verde en GitHub Actions.

## Fase 1 — Base de ingeniería y medición (julio 2026)

- [x] 1.1 Limpieza de dependencias (quitados draggable-flatlist y @google/generative-ai; gemini.ts → chat.ts; react-dom fijado en 19.1.0 para estabilizar el árbol de npm)
- [x] 1.2 ESLint 9 (flat config, eslint-config-expo ~10) + Prettier + scripts `lint`/`typecheck`/`format`; los 13 hallazgos iniciales corregidos (estado muerto en balances, imports duplicados, deps de hooks; el reset-on-open de TransactionForm lleva disable justificado)
- [x] 1.3 Jest (jest-expo) + 44 tests: dates, filters (applyFilters extraído a `services/filters.ts`), currency (`services/currency.ts` nuevo), recurring e insights con mocks; `jest.setup.js` mockea AsyncStorage y define env fake de Supabase
- [x] 1.4 CI en GitHub Actions (typecheck + lint + test) — ⚠️ verificar en el primer push
- [x] 1.5 EAS init: proyecto `@ixgen/finance-app` creado en expo.dev (ID c6d688c3); `expo-dev-client` instalado; `eas.json` con perfiles development/preview/production; scripts `build:dev` y `build:preview` en package.json — ⚠️ falta correr `npm run build:dev` para obtener el APK e instalarlo en el dispositivo
- [x] 1.6 Sentry instalado (`@sentry/react-native`), plugin en app.json, `services/sentry.ts` con DSN, `initSentry()` en `app/_layout.tsx` antes del primer render — ⚠️ para ver datos en el dashboard hay que tener un build compilado con el plugin nativo activado
- [ ] 1.7 Línea base de rendimiento → `docs/PERF.md` (plantilla lista; ⚠️ requiere build de preview y dispositivo físico del usuario)
- [x] 1.8 Índices Postgres → `docs/migrations/001_indexes.sql` escrito y reflejado en supabase-schema.sql (⚠️ falta ejecutarlo en Supabase)

## Fase 2 — SDK 56 + capa de datos con caché (agosto 2026)

- [ ] 2.1 Upgrade Expo SDK 54 → 56
- [ ] 2.2 TanStack Query + persistencia MMKV (migrar: expenses → summary → budget → balances)
- [ ] 2.3 Mutaciones optimistas con rollback
- [ ] 2.4 Skeletons en primera carga
- [ ] 2.5 Invalidaciones cruzadas entre recursos
- [ ] 2.6 Re-medición de PERF.md

## Fase 3 — Fluidez de UI (septiembre 2026)

- [ ] 3.1 FlashList en TransactionList (grupos aplanados) y demás listas grandes
- [ ] 3.2 Memoización (React.memo en cards, selectores Zustand por campo)
- [ ] 3.3 Arranque en frío (< 2.5 s): import diferido de groq-sdk, análisis de bundle, layout raíz sin spinner
- [ ] 3.4 Interacciones y teclado (form modal < 200 ms, streaming del chat sin re-render global)
- [ ] 3.5 Re-medición: presupuesto de rendimiento completo en verde

## Fase 4 — Offline-first y robustez (octubre 2026)

- [ ] 4.1 Cola de mutaciones offline con reintento
- [ ] 4.2 Manejo de errores consistente (toast único, retry con backoff)
- [ ] 4.3 Paginación / ventana de datos
- [ ] 4.4 Deep links y refresh de sesión
- [ ] 4.5 Auditoría RLS con dos cuentas

## Fase 5 — IA en backend y seguridad (noviembre 2026)

- [ ] 5.1 Edge Function `chat` (proxy Groq con streaming; eliminar y ROTAR la key del bundle)
- [ ] 5.2 Rate limiting por usuario
- [ ] 5.3 Historial de chat persistente (tabla `chat_messages`)
- [ ] 5.4 Biometría opcional
- [ ] 5.5 Re-medición PERF.md (primer token < 1.5 s)

## Fase 6 — Features + cierre (diciembre 2026)

- [ ] 6.0 ⚠️ Elegir con el usuario 2–3 features del backlog del ROADMAP antes de empezar
- [ ] 6.x Features elegidas: _(pendiente de decisión)_
- [ ] 6.y EAS Update (OTA) + distribución
- [ ] 6.z Pass final de rendimiento vs. línea base de julio + retro del semestre

## Registro de sesiones

| Fecha | Modelo/agente | Qué se hizo | Pendiente/notas |
|---|---|---|---|
| 2026-07-06 | Claude (Fable 5) | Diagnóstico inicial del repo; creación de ROADMAP.md, PROGRESS.md y reescritura de AGENTS.md | Empezar Fase 1, tarea 1.1 |
| 2026-07-06 | Claude (Fable 5) | Fase 1: tareas 1.1–1.4 y 1.8 completas. Verificado: lint limpio, 44 tests verdes, tsc limpio, `expo export` (bundle Metro) compila | Usuario: ejecutar migración en Supabase, pushear (activa CI), login EAS/Sentry. Luego seguir con 1.5–1.7 |
| 2026-07-06 | Claude (Fable 5) | Fase 1: tareas 1.5 y 1.6 completas. EAS project `@ixgen/finance-app` creado; eas.json; expo-dev-client instalado. Sentry integrado con DSN. docs/PERF.md creado con plantilla y script SQL de datos de prueba | Usuario: `npm run build:dev`, instalar APK, medir línea base en PERF.md. Luego la Fase 1 cierra al 100% |
