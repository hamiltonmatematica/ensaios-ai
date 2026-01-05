-- CreateTable
CREATE TABLE IF NOT EXISTS ap_user_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    device_info TEXT,
    ip_address TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE ap_user_sessions ENABLE ROW LEVEL SECURITY;

-- Create policy for service role
CREATE POLICY IF NOT EXISTS "sessions_all_service" ON ap_user_sessions
    FOR ALL USING (true) WITH CHECK (true);
