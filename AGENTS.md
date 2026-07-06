# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.
(Nota: el proyecto está hoy en SDK 54; la migración a 56 es la tarea 2.1 del roadmap. Hasta
entonces, verifica que la API que uses exista en la versión instalada en `package.json`.)

# Qué es esta app

App móvil de finanzas personales en pesos chilenos (CLP): registro de gastos, presupuestos
por categoría, deudas/saldos con personas, resumen mensual y un asistente IA con tools que
puede operar toda la app. Un solo desarrollador (Ignacio); UI en español e inglés.

Stack: Expo + expo-router (tabs) · React Native · TypeScript · Zustand · Supabase
(auth + Postgres con RLS) · Groq (llama) para el chat · Reanimated 4 · i18n propio.

Mapa del código:

- `app/(tabs)/` — pantallas: summary (landing), expenses, budget, balances, chat, settings
- `app/(auth)/login.tsx` y `app/_layout.tsx` — auth por sesión de Supabase
- `services/` — acceso a datos y lógica pura (transactions, budget, debts, insights, recurring, dates, i18n)
- `services/ai/` — asistente: prompt+loop de tools (`gemini.ts`) y definición de tools (`tools.ts`)
- `store/` — Zustand (transacciones, presupuesto, deudas, config de usuario, locale)
- `components/<dominio>/` — UI por dominio; `constants/colors.ts` — paleta única
- `supabase-schema.sql` — fuente de verdad del esquema; `docs/migrations/` — cambios incrementales

# Flujo de trabajo obligatorio (para cualquier agente/modelo)

1. **Lee `docs/PROGRESS.md`** — dice la fase activa, la siguiente tarea y qué quedó a medias.
2. **Lee la fase activa en `docs/ROADMAP.md`** — cada tarea trae criterios de aceptación
   y cómo probarla. Trabaja las tareas en orden; no adelantes fases sin acuerdo del usuario.
3. Implementa en pasos pequeños y verificables. Commits enfocados (el usuario decide cuándo pushear).
4. **Antes de dar algo por terminado**: `npm run typecheck`, `npm run lint` y `npm test`
   (los que existan ya en package.json) en verde, y prueba manual del flujo tocado con
   `npx expo start` en dispositivo/simulador.
5. **Al cerrar la sesión**: actualiza `docs/PROGRESS.md` (checkboxes + fila en el registro
   de sesiones, incluyendo qué quedó a medias y cualquier paso que deba ejecutar el usuario).

# Convenciones (no negociables)

- **i18n**: todo texto visible al usuario entra por `services/i18n.ts`, en **español e inglés**.
  Nunca strings hardcodeados en componentes.
- **Colores**: solo desde `constants/colors.ts`.
- **Moneda**: CLP, montos enteros, formateo `toLocaleString('es-CL')` (helpers existentes).
- **Datos**: acceso a Supabase solo desde `services/`; las pantallas no llaman a supabase directo.
- **Esquema de BD**: cualquier cambio actualiza `supabase-schema.sql` Y agrega un archivo
  numerado en `docs/migrations/`; no hay CLI de Supabase vinculado, así que hay que **avisar
  al usuario** para que ejecute la migración en el SQL Editor. Toda tabla nueva lleva RLS.
- **Secretos**: jamás en variables `EXPO_PUBLIC_*` (se compilan dentro del bundle). La key
  de Groq actual es una deuda conocida que se elimina en la Fase 5 del roadmap.
- **Dependencias nuevas**: solo si el ROADMAP las contempla o el usuario las aprueba;
  instalar con `npx expo install` para respetar versiones de la SDK.

# Presupuesto de rendimiento (proteger siempre)

El objetivo #1 del usuario es que la app sea 100% fluida. Ningún cambio puede regresar esto
(números completos y metodología en `docs/ROADMAP.md` y mediciones en `docs/PERF.md`):

- Cero spinners de pantalla completa una vez que hay datos cacheados.
- Scroll de listas a 60 fps; cards de listas memoizadas; mutaciones optimistas.
- Arranque en frío < 2.5 s (release, Android gama media).
- Si tocas rendimiento: mide antes y después, y deja los números en `docs/PERF.md`.

# Cosas que NO hacer

- No introducir otra librería de estado/fetching distinta a la elegida en el roadmap
  (TanStack Query para servidor + Zustand para UI, desde Fase 2).
- No usar `ScrollView` para listas potencialmente largas.
- No borrar ni "simplificar" las confirmaciones de borrado masivo del asistente IA.
- No editar datos de producción del usuario para probar: sembrar datos en un mes de prueba
  (p. ej. 2020-01) y limpiarlos al terminar.
