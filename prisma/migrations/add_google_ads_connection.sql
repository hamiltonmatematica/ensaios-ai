-- CreateTable
CREATE TABLE IF NOT EXISTS "GoogleAdsConnection" (
    id TEXT PRIMARY KEY,
    "refreshToken" TEXT NOT NULL,
    "loginCustomerIds" JSONB NOT NULL,
    "connectedEmail" TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL
);

-- Enable RLS
ALTER TABLE "GoogleAdsConnection" ENABLE ROW LEVEL SECURITY;

-- Create policy for service role (mesmo padrão de ap_user_sessions — sem RLS por usuário,
-- é uma conexão única do operador da conta, não algo escopado por usuário final)
CREATE POLICY IF NOT EXISTS "google_ads_connection_all_service" ON "GoogleAdsConnection"
    FOR ALL USING (true) WITH CHECK (true);
