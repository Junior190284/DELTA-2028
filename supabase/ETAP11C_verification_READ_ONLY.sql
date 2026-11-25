-- READ-ONLY preflight/postflight checks. Run with sufficiently privileged SQL editor role.
-- 1. Actual column privileges, including inherited PUBLIC grants.
SELECT role_name, column_name,
       has_column_privilege(role_name, 'public.profiles', column_name, 'UPDATE') AS can_update,
       has_column_privilege(role_name, 'public.profiles', column_name, 'SELECT') AS can_select
FROM (VALUES ('anon'), ('authenticated'), ('service_role')) AS roles(role_name)
CROSS JOIN (VALUES ('id'), ('display_name'), ('role'), ('created_at')) AS columns(column_name)
ORDER BY role_name, column_name;

-- Expected UPDATE: authenticated ONLY display_name; anon none; service_role all.
-- NOTE: has_column_privilege can be true because of table- or column-level privileges.

-- 2. Effective table privileges.
SELECT role_name,
  has_table_privilege(role_name, 'public.profiles', 'INSERT') AS can_insert,
  has_table_privilege(role_name, 'public.profiles', 'DELETE') AS can_delete,
  has_table_privilege(role_name, 'public.profiles', 'TRUNCATE') AS can_truncate,
  has_table_privilege(role_name, 'public.profiles', 'TRIGGER') AS can_trigger,
  has_table_privilege(role_name, 'public.profiles', 'REFERENCES') AS can_references
FROM (VALUES ('anon'), ('authenticated'), ('service_role')) AS roles(role_name);

-- 3. Verify RLS is on, and inspect all policies (including unexpected names).
SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname IN ('profiles','app_settings');
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('profiles','app_settings')
ORDER BY tablename, policyname;

-- 4. Check trigger event coverage and security definer settings.
SELECT trigger_name, event_manipulation, action_timing, action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public' AND event_object_table = 'profiles'
  AND trigger_name = 'trg_prevent_role_self_escalation';
SELECT p.proname, p.prosecdef, p.proconfig
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname IN ('prevent_role_self_escalation','handle_new_user');

-- 5. Pilot stays switched off.
SELECT key, value->>'enabled' AS enabled, value->>'kill_switch' AS kill_switch,
       value->'allowed_user_ids' AS allowed_user_ids
FROM public.app_settings WHERE key = 'collection_3d_pilot';

-- 6. Inspect column-grant ACL and PUBLIC explicitly for unexpected grants.
SELECT a.attname, a.attacl FROM pg_attribute a
WHERE a.attrelid = 'public.profiles'::regclass AND a.attnum > 0 AND NOT a.attisdropped;
SELECT relname, relacl FROM pg_class WHERE oid IN ('public.profiles'::regclass, 'public.app_settings'::regclass);

-- Real mutation authorization tests must use separate NONPRODUCTION DB and real
-- anon/authenticated sessions and verify update(role/id/created_at) fails while
-- update(display_name) for own profile works. Do not test writes on production.
