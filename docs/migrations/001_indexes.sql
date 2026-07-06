-- 001: Índices para las consultas más frecuentes (Fase 1, tarea 1.8 del roadmap).
-- Ejecutar en Supabase: project > SQL Editor > New query > pegar y Run.
--
-- Por qué: transactions se consulta siempre por (user_id, month) — la RLS agrega el
-- filtro de user_id a cada query — y las vistas por categoría filtran (user_id, category).
-- debts se lee filtrando por paid. Sin índices, son seq scans que crecen con el historial.

CREATE INDEX IF NOT EXISTS idx_tx_user_month ON transactions (user_id, month);
CREATE INDEX IF NOT EXISTS idx_tx_user_category ON transactions (user_id, category);
CREATE INDEX IF NOT EXISTS idx_debts_user_paid ON debts (user_id, paid);
