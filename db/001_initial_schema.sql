-- VoltIQ Database Schema Migration
-- Designed for Supabase PostgreSQL

-- -----------------------------------------------------------------------------
-- 1. TABLES
-- -----------------------------------------------------------------------------

-- TABLE 1: users (extends auth.users)
CREATE TABLE users (
  id uuid REFERENCES auth.users PRIMARY KEY,
  full_name text,
  plan_tier text DEFAULT 'free' CHECK (plan_tier IN ('free','pro','enterprise')),
  locale text DEFAULT 'latest',
  created_at timestamptz DEFAULT now()
);

-- TABLE 2: homes
CREATE TABLE homes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  bedrooms int CHECK (bedrooms BETWEEN 1 AND 20),
  occupants int CHECK (occupants BETWEEN 1 AND 30),
  city text,
  home_type text CHECK (home_type IN ('apartment','villa','bungalow','row_house')),
  area_sqft float,
  tariff_id uuid, -- Reference to tariffs table added later
  created_at timestamptz DEFAULT now()
);

-- TABLE 3: tariffs
CREATE TABLE tariffs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text CHECK (type IN ('flat','slab','time_of_use','seasonal')),
  slab_config jsonb NOT NULL,
  fixed_charge_inr float DEFAULT 100,
  fuel_surcharge_pct float DEFAULT 0.08,
  electricity_duty_pct float DEFAULT 0.05,
  is_default boolean DEFAULT false,
  state text
);

-- TABLE 4: appliances
CREATE TABLE appliances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id uuid REFERENCES homes(id) ON DELETE CASCADE,
  name text NOT NULL,
  brand text,
  category text CHECK (category IN ('hvac','kitchen','entertainment','lighting','ev','laundry','other')),
  rated_watts float CHECK (rated_watts BETWEEN 1 AND 15000),
  standby_watts float DEFAULT 0,
  efficiency_class text CHECK (efficiency_class IN ('A+++','A++','A+','A','B','C','D','E','F','G')),
  age_years int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- TABLE 5: usage_logs
CREATE TABLE usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appliance_id uuid REFERENCES appliances(id) ON DELETE CASCADE,
  log_date date NOT NULL,
  usage_hours float CHECK (usage_hours BETWEEN 0 AND 24),
  computed_kwh float,
  created_at timestamptz DEFAULT now(),
  UNIQUE(appliance_id, log_date)
);

-- TABLE 6: bills
CREATE TABLE bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id uuid REFERENCES homes(id) ON DELETE CASCADE,
  tariff_id uuid REFERENCES tariffs(id),
  billing_month text NOT NULL,  -- format: YYYY-MM
  units_consumed float,
  energy_charge_inr float,
  fixed_charge_inr float,
  fuel_surcharge_inr float,
  electricity_duty_inr float,
  total_amount_inr float,
  is_predicted boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(home_id, billing_month)
);

-- TABLE 7: ai_insights
CREATE TABLE ai_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id uuid REFERENCES homes(id) ON DELETE CASCADE,
  insight_type text CHECK (insight_type IN ('anomaly','recommendation','forecast','score')),
  title text,
  content jsonb NOT NULL,
  confidence_score float CHECK (confidence_score BETWEEN 0 AND 1),
  target_month text,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- TABLE 8: alerts
CREATE TABLE alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id uuid REFERENCES homes(id) ON DELETE CASCADE,
  alert_type text CHECK (alert_type IN ('spike','budget','anomaly','efficiency')),
  severity text CHECK (severity IN ('low','medium','high','critical')),
  threshold_kwh float,
  triggered_at timestamptz,
  resolved_at timestamptz,
  message text,
  is_read boolean DEFAULT false
);

-- TABLE 9: chat_sessions
CREATE TABLE chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  messages jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 2. INDEXES
-- -----------------------------------------------------------------------------
CREATE INDEX idx_homes_user_id ON homes(user_id);
CREATE INDEX idx_appliances_home_id ON appliances(home_id);
CREATE INDEX idx_usage_logs_appliance_date ON usage_logs(appliance_id, log_date);
CREATE INDEX idx_bills_home_month ON bills(home_id, billing_month);

-- -----------------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY (RLS)
-- -----------------------------------------------------------------------------
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE homes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tariffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE appliances ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

-- Users (Users can only modify and see their own user profile)
CREATE POLICY "Users can manage own profile" ON users
  FOR ALL USING (auth.uid() = id);

-- Homes (Users can only manage their own homes)
CREATE POLICY "Users can manage own homes" ON homes
  FOR ALL USING (auth.uid() = user_id);

-- Tariffs (All authenticated users can read tariffs, but only admins could create them ideally. For now, public read)
CREATE POLICY "Anyone can view tariffs" ON tariffs
  FOR SELECT USING (true);

-- Appliances (Access based on home ownership)
CREATE POLICY "Users can manage their appliances" ON appliances
  FOR ALL USING (
    home_id IN (SELECT id FROM homes WHERE user_id = auth.uid())
  );

-- Usage Logs (Access based on appliance -> home ownership)
CREATE POLICY "Users can manage usage logs" ON usage_logs
  FOR ALL USING (
    appliance_id IN (
      SELECT appliances.id FROM appliances 
      JOIN homes ON appliances.home_id = homes.id 
      WHERE homes.user_id = auth.uid()
    )
  );

-- Bills (Access based on home ownership)
CREATE POLICY "Users can manage bills" ON bills
  FOR ALL USING (
    home_id IN (SELECT id FROM homes WHERE user_id = auth.uid())
  );

-- AI Insights (Access based on home ownership)
CREATE POLICY "Users can view AI insights" ON ai_insights
  FOR ALL USING (
    home_id IN (SELECT id FROM homes WHERE user_id = auth.uid())
  );

-- Alerts (Access based on home ownership)
CREATE POLICY "Users can manage alerts" ON alerts
  FOR ALL USING (
    home_id IN (SELECT id FROM homes WHERE user_id = auth.uid())
  );

-- Chat Sessions (Access based on user ID directly)
CREATE POLICY "Users can manage their chat sessions" ON chat_sessions
  FOR ALL USING (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 4. SEED DATA (Tariffs)
-- -----------------------------------------------------------------------------
INSERT INTO tariffs (name, type, slab_config, fixed_charge_inr, fuel_surcharge_pct, electricity_duty_pct, is_default, state)
VALUES 
  (
    'Maharashtra (MSEDCL) Res', 
    'slab', 
    '[{"min": 0, "max": 100, "rate": 5.58}, {"min": 101, "max": 300, "rate": 11.46}, {"min": 301, "max": 500, "rate": 15.72}, {"min": 501, "max": 999999, "rate": 17.81}]', 
    128, 0.10, 0.16, true, 'Maharashtra'
  ),
  (
    'Karnataka (BESCOM) Res Urban', 
    'slab', 
    '[{"min": 0, "max": 50, "rate": 4.15}, {"min": 51, "max": 100, "rate": 5.60}, {"min": 101, "max": 200, "rate": 7.15}, {"min": 201, "max": 999999, "rate": 8.20}]', 
    110, 0.06, 0.09, true, 'Karnataka'
  ),
  (
    'Delhi (BSES) Res', 
    'slab', 
    '[{"min": 0, "max": 200, "rate": 3.00}, {"min": 201, "max": 400, "rate": 4.50}, {"min": 401, "max": 800, "rate": 6.50}, {"min": 801, "max": 1200, "rate": 7.00}, {"min": 1201, "max": 999999, "rate": 8.00}]', 
    40, 0.08, 0.05, true, 'Delhi'
  );
