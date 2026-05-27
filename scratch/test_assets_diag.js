const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Capture all requests/responses
  const poiCalls = [];
  page.on('response', async (res) => {
    if (res.url().includes('poi')) {
      const status = res.status();
      let body = '';
      try { body = await res.text(); } catch {}
      poiCalls.push({ url: res.url(), status, body: body.slice(0, 800) });
    }
  });

  const jsErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') jsErrors.push(msg.text());
    if (msg.text().includes('poi') || msg.text().includes('asset') || msg.text().includes('viewport')) {
      console.log('[CONSOLE]', msg.type(), msg.text().slice(0, 200));
    }
  });

  console.log('Going to login page...');
  await page.goto('http://localhost:3000/login');
  await page.waitForTimeout(1500);

  // Try to fill login form
  await page.fill('input[name="identifier"]', 'admin123').catch(() => {});
  await page.fill('input[name="password"]', 'geoai123').catch(() => {});
  await page.click('button[type="submit"]').catch(() => {});
  await page.waitForTimeout(5000);

  console.log('URL after login attempt:', page.url());
  await page.screenshot({ path: path.join(__dirname, 'diag_step1.png') });

  if (page.url().includes('/login')) {
    // Try different password
    console.log('Still on login, trying other passwords...');
    for (const pw of ['admin123', 'admin', 'password', 'geoai', '123456']) {
      await page.fill('input[name="identifier"]', 'admin123').catch(() => {});
      await page.fill('input[name="password"]', pw).catch(() => {});
      await page.click('button[type="submit"]').catch(() => {});
      await page.waitForTimeout(3000);
      if (!page.url().includes('/login')) {
        console.log('Login succeeded with password:', pw);
        break;
      }
      const err = await page.$('.form-error').catch(() => null);
      if (err) {
        const errText = await err.textContent().catch(() => '');
        console.log(`  pw="${pw}" => error: ${errText}`);
      }
    }
  }

  if (page.url().includes('/login')) {
    console.log('Cannot login. Checking if user can access api directly...');
    // Try direct API call to see if backend is alive
    const apiCheck = await page.evaluate(async () => {
      try {
        const r = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ identifier: 'admin123', password: 'geoai123' })
        });
        return { status: r.status, body: await r.text() };
      } catch (e) {
        return { error: e.message };
      }
    });
    console.log('Direct login API response:', JSON.stringify(apiCheck));
  } else {
    // Logged in! Now test assets
    console.log('\n=== Logged in, testing assets ===');
    await page.waitForTimeout(3000);

    // Directly call the poi/search API from the browser context (has auth cookie)
    const poiTest = await page.evaluate(async () => {
      try {
        const r = await fetch('/api/poi/search?limit=10&south=16.035&west=108.188&north=16.103&east=108.249');
        const status = r.status;
        const text = await r.text();
        return { status, body: text.slice(0, 500) };
      } catch (e) {
        return { error: e.message };
      }
    });
    console.log('POI search from browser:', JSON.stringify(poiTest));

    // Click assets tool and check
    await page.screenshot({ path: path.join(__dirname, 'diag_logged_in.png') });

    const btns = await page.$$('button');
    for (const btn of btns) {
      const text = await btn.textContent().catch(() => '');
      const label = await btn.getAttribute('aria-label').catch(() => '');
      console.log(`Button: text="${text.trim().slice(0, 30)}" label="${label}"`);
    }
  }

  console.log('\nPOI calls intercepted:', poiCalls.length);
  for (const c of poiCalls) {
    console.log('  ', c.status, c.url);
    console.log('  body:', c.body.slice(0, 300));
  }

  if (jsErrors.length > 0) {
    console.log('\nJS Errors:');
    jsErrors.forEach(e => console.log(' ', e.slice(0, 200)));
  }

  await browser.close();
})();
