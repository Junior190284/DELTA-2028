const fs = require('fs');
const path = require('path');

const envPath = path.resolve('.env.local');
const content = fs.readFileSync(envPath, 'utf8');
const lines = content.split(/\r?\n/);
function parseKey(name) {
  const line = lines.find(l => l.trim().startsWith(name + '='));
  if (!line) return null;
  const idx = line.indexOf('=');
  return line.slice(idx + 1).trim();
}

const url = parseKey('NEXT_PUBLIC_SUPABASE_URL');
const servKey = parseKey('SUPABASE_SERVICE_ROLE_KEY');

if (!url || !url.includes('tdlsxamxtygojxhmjjvp')) {
  console.error('CRITICAL ABORT: Not staging tdlsxamxtygojxhmjjvp');
  process.exit(1);
}

const sql = `
ALTER TABLE IF EXISTS public.delta_system_events 
    ADD COLUMN IF NOT EXISTS audience_type TEXT NOT NULL DEFAULT 'TEAM',
    ADD COLUMN IF NOT EXISTS target_user_id UUID NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS target_player_id UUID NULL REFERENCES public.players(id) ON DELETE CASCADE;

ALTER TABLE public.delta_system_events DROP CONSTRAINT IF EXISTS chk_delta_system_events_audience;
ALTER TABLE public.delta_system_events ADD CONSTRAINT chk_delta_system_events_audience 
    CHECK (
        (audience_type = 'TEAM' AND target_user_id IS NULL AND target_player_id IS NULL) OR
        (audience_type = 'USER' AND target_user_id IS NOT NULL) OR
        (audience_type = 'PLAYER' AND target_player_id IS NOT NULL) OR
        (audience_type = 'ADMIN' AND target_user_id IS NULL AND target_player_id IS NULL)
    );

CREATE INDEX IF NOT EXISTS idx_delta_system_events_audience_user ON public.delta_system_events(audience_type, target_user_id);
CREATE INDEX IF NOT EXISTS idx_delta_system_events_audience_player ON public.delta_system_events(audience_type, target_player_id);

ALTER TABLE public.delta_system_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public select system events" ON public.delta_system_events;
DROP POLICY IF EXISTS "delta_system_events_select_authenticated" ON public.delta_system_events;
DROP POLICY IF EXISTS "delta_system_events_audience_select" ON public.delta_system_events;

CREATE POLICY "delta_system_events_audience_select" ON public.delta_system_events
FOR SELECT TO authenticated
USING (
    audience_type = 'TEAM'
    OR (audience_type = 'USER' AND (target_user_id = auth.uid() OR public.is_staff()))
    OR (audience_type = 'PLAYER' AND (public.is_parent_of(target_player_id) OR public.is_staff()))
    OR (audience_type = 'ADMIN' AND public.current_role() = 'admin')
);

DROP POLICY IF EXISTS "user achievements own select" ON public.user_achievements;
CREATE POLICY "user achievements own select" ON public.user_achievements
FOR SELECT TO authenticated
USING (
    user_id = auth.uid() 
    OR (player_id IS NOT NULL AND public.is_parent_of(player_id)) 
    OR public.is_staff()
);

REVOKE EXECUTE ON FUNCTION public.is_staff() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_parent_of(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.current_role() FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_permission(TEXT) FROM anon;

GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_parent_of(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_permission(TEXT) TO authenticated;
`;

async function applySQL() {
  console.log('Sending SQL to staging Supabase...');
  try {
    const res = await fetch(url + '/rest/v1/rpc/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: servKey,
        Authorization: 'Bearer ' + servKey
      }
    });
    console.log('RPC endpoint status:', res.status);
  } catch (err) {
    console.error('Error applying SQL:', err);
  }
}

applySQL();
