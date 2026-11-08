-- Supabase Postgres Migration for Edito
-- Initial Schema & Row Level Security

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  locale TEXT DEFAULT 'en',
  theme TEXT DEFAULT 'dark',
  settings JSONB DEFAULT '{}'::jsonb,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Projects Table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'stems', 'audio_tool', 'photo', 'collage', 'video'
  title TEXT NOT NULL,
  state JSONB DEFAULT '{}'::jsonb, -- pitch, tempo, loops, markers, chords, settings
  thumbnail_path TEXT,
  size_bytes BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Assets Table
CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  kind TEXT NOT NULL, -- 'original', 'stem_vocals', 'stem_drums', 'stem_bass', 'stem_other', 'export', 'image'
  storage_path TEXT NOT NULL,
  mime TEXT,
  size_bytes BIGINT DEFAULT 0,
  sha256 TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Shares Table
CREATE TABLE IF NOT EXISTS shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  visibility TEXT DEFAULT 'unlisted', -- 'public', 'unlisted', 'private'
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Reports Table
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  share_id UUID REFERENCES shares(id) ON DELETE CASCADE,
  reporter_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ip_hash TEXT,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'reviewed', 'actioned', 'dismissed'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Feedback Table
CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  device_info JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Model Versions Manifest Table
CREATE TABLE IF NOT EXISTS model_versions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  url TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  sha256 TEXT,
  min_browser_features TEXT[],
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Usage Counters Table
CREATE TABLE IF NOT EXISTS usage_counters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  period DATE NOT NULL,
  bytes_stored BIGINT DEFAULT 0,
  shares_created INTEGER DEFAULT 0,
  api_calls INTEGER DEFAULT 0,
  UNIQUE(user_id, period)
);

-- 9. Events Table (Admin Analytics & Audit)
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ts TIMESTAMPTZ DEFAULT NOW(),
  session_hash TEXT,
  ip_hash TEXT,
  ip_masked TEXT,
  country_code TEXT,
  city TEXT,
  category TEXT, -- 'audio', 'image', 'video', 'general'
  tool TEXT,
  action TEXT, -- 'open', 'process', 'export', 'error'
  ok BOOLEAN DEFAULT TRUE,
  error_type TEXT,
  device_class TEXT, -- 'mobile', 'tablet', 'desktop'
  os TEXT,
  browser TEXT,
  webgpu_supported BOOLEAN DEFAULT FALSE,
  backend_used TEXT, -- 'webgpu', 'wasm'
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for Events as per PRD 17.10
CREATE INDEX IF NOT EXISTS idx_events_ts ON events(ts);
CREATE INDEX IF NOT EXISTS idx_events_tool_ts ON events(tool, ts);
CREATE INDEX IF NOT EXISTS idx_events_country_ts ON events(country_code, ts);
CREATE INDEX IF NOT EXISTS idx_events_ip_hash ON events(ip_hash);
CREATE INDEX IF NOT EXISTS idx_events_action_ts ON events(action, ts);

-- 10. Daily Stats Table
CREATE TABLE IF NOT EXISTS daily_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  category TEXT NOT NULL,
  tool TEXT NOT NULL,
  country_code TEXT,
  device_class TEXT,
  visits INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,
  opens INTEGER DEFAULT 0,
  processes INTEGER DEFAULT 0,
  exports INTEGER DEFAULT 0,
  errors INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date, category, tool, country_code, device_class)
);

-- 11. Admin Settings Table
CREATE TABLE IF NOT EXISTS admin_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  retention_days INTEGER DEFAULT 90,
  excluded_ip_hashes TEXT[] DEFAULT ARRAY[]::TEXT[],
  log_full_ip BOOLEAN DEFAULT FALSE,
  alert_email TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert Default Admin Settings
INSERT INTO admin_settings (retention_days, excluded_ip_hashes, log_full_ip)
VALUES (90, '{}', FALSE)
ON CONFLICT DO NOTHING;

-- RLS (Row Level Security) Configuration
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can view & update their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Projects: Only project owner can access
CREATE POLICY "Owners can manage projects" ON projects
  FOR ALL USING (auth.uid() = owner_id);

-- Assets: Only asset owner can access
CREATE POLICY "Owners can manage assets" ON assets
  FOR ALL USING (auth.uid() = owner_id);

-- Shares: Public access by token via functions, owner can manage
CREATE POLICY "Owners can manage shares" ON shares
  FOR ALL USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = shares.project_id AND projects.owner_id = auth.uid()));

CREATE POLICY "Public read for valid shares" ON shares
  FOR SELECT USING (visibility = 'public' OR visibility = 'unlisted');

-- Feedback & Reports: authenticated or anonymous inserts
CREATE POLICY "Anyone can submit feedback" ON feedback
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can submit reports" ON reports
  FOR INSERT WITH CHECK (true);

-- Events: Only Admin can read
CREATE POLICY "Admin can view events" ON events
  FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = TRUE));

-- Cleanup function for retention
CREATE OR REPLACE FUNCTION purge_old_events() RETURNS VOID AS $$
DECLARE
  retention INT;
BEGIN
  SELECT retention_days INTO retention FROM admin_settings LIMIT 1;
  IF retention IS NULL THEN retention := 90; END IF;

  DELETE FROM events WHERE ts < (NOW() - (retention || ' days')::INTERVAL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

