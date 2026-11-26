import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

describe('DELTA-051T3 — SECURITY HARDENING & DEVELOPER CENTER TESTS', () => {
  test('1. current-profile dev-login fallback is strictly blocked on Vercel and production', () => {
    const code = fs.readFileSync('lib/current-profile.ts', 'utf8');

    // Verify hard flags: isProduction, isVercel, isLoopback
    assert.ok(code.includes('isProduction'), 'Must check isProduction');
    assert.ok(code.includes('isVercel'), 'Must check isVercel');
    assert.ok(code.includes('!isProduction && !isVercel && isLoopback'), 'Dev fallback must only run on local loopback');

    // Verify that dev role never impersonates real profile from database
    assert.ok(
      !code.includes('.from("profiles").select("id,role,display_name").eq("role", devRole)'),
      'Must NOT query real profiles to impersonate'
    );
    assert.ok(
      code.includes('dev_user_${devRole}'),
      'Must use synthetic mock identity dev_user_*'
    );
  });

  test('2. /preview/dev-center page enforces production notFound() guard', () => {
    const pageCode = fs.readFileSync('app/preview/dev-center/page.tsx', 'utf8');

    assert.ok(
      pageCode.includes('process.env.NODE_ENV === "production"') && pageCode.includes('process.env.VERCEL_ENV === "production"'),
      'Must check production environment'
    );
    assert.ok(pageCode.includes('notFound()'), 'Must return 404 on production');
  });

  test('3. dev-center masks database host and never leaks passwords or secrets', () => {
    const pageCode = fs.readFileSync('app/preview/dev-center/page.tsx', 'utf8');
    const clientCode = fs.readFileSync('app/preview/dev-center/DevCenterClient.tsx', 'utf8');

    assert.ok(pageCode.includes('host.slice(0, 8) + "..." + host.slice(-12)'), 'Database host must be masked');
    assert.ok(!pageCode.includes('SUPABASE_SERVICE_ROLE_KEY'), 'Service key must not be passed to telemetry');
    assert.ok(!clientCode.includes('password'), 'Client code must not contain hardcoded passwords');
  });

  test('4. Training attendance route enforces staff checks and protects present status', () => {
    const routeCode = fs.readFileSync('app/api/training/attendance/route.ts', 'utf8');

    assert.ok(routeCode.includes('isStaff'), 'Must check staff status');
    assert.ok(routeCode.includes('isParentOfChild'), 'Must check parent link');
    assert.ok(
      routeCode.includes('Obecność na boisku została już potwierdzona przez trenera'),
      'Must block parent overwrite of coach present status'
    );
  });
});
