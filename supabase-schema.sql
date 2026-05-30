-- Run this in the Supabase SQL editor (project > SQL Editor > New query)

CREATE TABLE user_config (
  user_id UUID REFERENCES auth.users PRIMARY KEY,
  categories TEXT[] NOT NULL DEFAULT '{}',
  payment_methods TEXT[] NOT NULL DEFAULT '{}'
);

ALTER TABLE user_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own config" ON user_config
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  date DATE NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  amount INTEGER NOT NULL,
  payment_method TEXT,
  is_fixed BOOLEAN DEFAULT false,
  notes TEXT,
  week SMALLINT,
  registered BOOLEAN DEFAULT false,
  month TEXT NOT NULL,   -- format: YYYY-MM
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE budget_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  month TEXT NOT NULL,
  category TEXT NOT NULL,
  budget INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, month, category)
);

CREATE TABLE debts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  person TEXT NOT NULL,
  amount INTEGER NOT NULL,   -- positive = they owe you, negative = you owe them
  description TEXT,
  date DATE NOT NULL,
  paid BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own transactions" ON transactions
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own budget_config" ON budget_config
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own debts" ON debts
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
