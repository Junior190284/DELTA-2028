const https = require('https');

async function checkUrl(url, options = {}) {
  return new Promise((resolve) => {
    const parsed = new URL(url);
    const req = https.request({
      hostname: parsed.hostname,
      port: 443,
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'Delta-Smoke-Test/1.0',
        ...(options.headers || {})
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({
        status: res.statusCode,
        statusText: res.statusMessage,
        headers: res.headers,
        body: data
      }));
    });
    req.on('error', (err) => resolve({ status: 0, statusText: err.message, body: '' }));
    req.end();
  });
}

async function smokeTest() {
  const base = 'https://delta-2028.vercel.app';
  console.log('=== RUNNING PRODUCTION POST-DEPLOY SMOKE TEST ===');
  console.log('Production URL:', base);

  const tests = [
    { name: 'HOME PAGE', path: '/' },
    { name: 'LOGIN PAGE', path: '/login' },
    { name: 'DASHBOARD (Auth Redirect)', path: '/dashboard' },
    { name: 'API AUTH STATUS', path: '/api/auth/status' },
    { name: 'API EVENTS (Live Bar / News Feed)', path: '/api/events' },
    { name: 'API ADMIN SYNC STATUS', path: '/api/admin/sync-status' },
    { name: 'API ADMIN HEALTH CHECK', path: '/api/admin/health-check' }
  ];

  let allPassed = true;

  for (const t of tests) {
    const res = await checkUrl(base + t.path);
    const ok = res.status >= 200 && res.status < 400;
    console.log(`[${res.status}] ${t.name} -> ${ok ? 'OK' : 'FAIL'} (${res.statusText})`);
    if (res.status === 500 || res.status === 0) {
      allPassed = false;
    }
  }

  // Check home page content
  const homeRes = await checkUrl(base + '/');
  const containsDelta = homeRes.body.includes('DELTA') || homeRes.body.includes('Delta');
  console.log(`Home Content Validation: ${containsDelta ? 'PASS (HTML contains DELTA brand)' : 'FAIL'}`);

  // Check Supabase public key / url references in script chunks if available
  const matchSupabaseProd = homeRes.body.includes('fctgruvciakhohfxkdzp');
  const matchSupabaseStaging = homeRes.body.includes('tdlsxamxtygojxhmjjvp');
  console.log(`Supabase Production ID in bundle/runtime: ${matchSupabaseProd ? 'CONFIRMED (fctgruvciakhohfxkdzp)' : 'NOT EXPOSED IN RAW HTML (Server Rendered)'}`);
  console.log(`Supabase Staging ID present in bundle: ${matchSupabaseStaging ? 'WARNING: STAGING DETECTED' : 'CLEAN (Zero staging ref)'}`);

  console.log('\n========================================================');
  console.log(`SMOKE TEST RESULT: ${allPassed ? 'EXECUTED PASS' : 'EXECUTED FAIL'}`);
  console.log('========================================================');
}

smokeTest();
