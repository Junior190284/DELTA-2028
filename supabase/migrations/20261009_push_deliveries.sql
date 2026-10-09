-- ==============================================================================
-- DELTA 2018 GM — ETAP 11B: PUSH DELIVERIES DEDUPLICATION LEDGER & AUDIT TRAIL
-- DO NOT EXECUTE ON PRODUCTION DB IN 11B (MIGRATION APPLIED = NO)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.push_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    subscription_id UUID NOT NULL REFERENCES public.push_subscriptions(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING' | 'SENT' | 'FAILED' | 'GONE' | 'SKIPPED'
    attempt_count INTEGER NOT NULL DEFAULT 0,
    attempted_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    error_code TEXT,
    provider_status INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_push_delivery_event_sub UNIQUE(event_id, subscription_id)
);

-- Indexes for performance and quick ledger lookups
CREATE INDEX IF NOT EXISTS idx_push_deliveries_user_created ON public.push_deliveries(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_push_deliveries_event ON public.push_deliveries(event_id);
CREATE INDEX IF NOT EXISTS idx_push_deliveries_status ON public.push_deliveries(status);

-- Enable RLS
ALTER TABLE public.push_deliveries ENABLE ROW LEVEL SECURITY;

-- Security Policies:
-- Users can only view their own delivery log (if needed by UI diagnostics)
DROP POLICY IF EXISTS "push_deliveries_select_own" ON public.push_deliveries;
CREATE POLICY "push_deliveries_select_own"
ON public.push_deliveries
FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()));

-- No direct client insert/update/delete.
-- Writes are performed exclusively by server-side service role during push dispatch.

-- Grants for PostgREST & Supabase Roles (RLS strictly governs access)
GRANT ALL ON public.push_deliveries TO postgres, service_role;
GRANT SELECT ON public.push_deliveries TO authenticated, anon;

NOTIFY pgrst, 'reload schema';

