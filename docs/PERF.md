# Mediciones de rendimiento

> Metodología: todas las mediciones se hacen en **build de release o preview** (APK/IPA
> firmado, sin Metro bundler activo) en un **dispositivo físico Android de gama media** —
> el peor caso realista. Nunca en simulador ni en modo desarrollo (los resultados no son
> representativos). Cada fase re-mide con el mismo dispositivo y mismo conjunto de datos.

## Dispositivo de referencia

| Campo | Valor |
|---|---|
| Modelo | _(llenar antes de medir: p.ej. Samsung Galaxy A53)_ |
| Android | _(versión)_ |
| RAM | _(GB)_ |
| Build medida | _(EAS build ID o commit SHA)_ |

## Datos de prueba

Sembrar ~500 transacciones de julio de prueba en la cuenta con este script SQL
(ejecutar en Supabase SQL Editor; usa el `user_id` de tu cuenta):

```sql
-- Cambiar 'TU-USER-ID-AQUI' por tu UUID de Supabase (Settings > Auth > Users)
DO $$
DECLARE
  uid UUID := 'TU-USER-ID-AQUI';
  i   INT;
BEGIN
  FOR i IN 1..500 LOOP
    INSERT INTO transactions (user_id, date, category, description, amount, payment_method, is_fixed, week, registered, month)
    VALUES (
      uid,
      ('2020-01-' || LPAD((MOD(i, 28) + 1)::TEXT, 2, '0'))::DATE,
      (ARRAY['Comida','Transporte','Hogar','Entretenimiento','Salud'])[MOD(i, 5) + 1],
      'Prueba ' || i,
      (RANDOM() * 50000 + 500)::INT,
      'Débito',
      false,
      (MOD(i, 4) + 1),
      false,
      '2020-01'
    );
  END LOOP;
END $$;
```

Navega a enero 2020 en la app para ver las 500 transacciones. Al terminar las mediciones,
borrar con: `DELETE FROM transactions WHERE month = '2020-01';`

---

## Línea base — Fase 1 (julio 2026, pre-optimización)

> Llenar con los resultados reales del primer build de preview/dev con Sentry activo.
> El agente no puede medir desde aquí; estas son mediciones manuales.

| Métrica | Objetivo | Medición |
|---|---|---|
| Arranque en frío → pantalla Resumen interactiva | < 2.5 s | — |
| 1er cambio de tab (datos recién cargados) | spinner visible, normal | — |
| Cambio de tab subsiguiente (datos en store) | < 500 ms sin spinner de pantalla completa | — |
| Scroll en lista con 500 transacciones (fps) | referencia | — |
| Apertura del form de gasto | < 500 ms | — |
| Primer token del asistente IA | referencia | — |

**Notas de línea base:**
- _(anotar observaciones: lag visible en el scroll, cuándo aparecen spinners, etc.)_

---

## Fase 2 — post TanStack Query + caché MMKV (agosto 2026)

_(llenar al cerrar la fase)_

| Métrica | Objetivo | Medición |
|---|---|---|
| Arranque en frío → Resumen interactiva | < 2.5 s | — |
| Cambio de tab (datos cacheados) | **0 spinners de pantalla** | — |
| Mutación (agregar gasto, reflejo en UI) | inmediato (optimista) | — |

---

## Fase 3 — post FlashList + memoización (septiembre 2026)

_(llenar al cerrar la fase)_

| Métrica | Objetivo | Medición |
|---|---|---|
| Arranque en frío | < 2.5 s | — |
| Scroll 500 tx (fps) | **60 fps sostenidos** | — |
| Apertura del form de gasto | **< 200 ms** | — |
| Primer token IA | < 1.5 s | — |

---

## Instrucciones de medición

**Arranque en frío**: cierra la app completamente (kill from recents), activa anotación de
tiempo (cronómetro físico o `adb logcat -T 1 | grep -E "Choreographer|Displayed"`),
abre la app y mide hasta que los datos de Resumen son interactivos (puedes tocar las cards).

**FPS del scroll**: en el dev client, activa Performance Monitor (shake device > Performance).
En builds de release, usa Android Studio Profiler o `adb shell dumpsys gfxinfo <package>`.

**Apertura del form**: mide desde el tap en el FAB (+) hasta que el modal aparece completo.

**Primer token IA**: mide desde el tap en "enviar" hasta que el primer caracter aparece en
el bubble del asistente.
