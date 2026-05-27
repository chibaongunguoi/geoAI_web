const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('response', async res => {
    if (res.url().includes('/api/reports') && res.request().method() === 'POST') {
       console.log('POST /api/reports status:', res.status());
       console.log('Response:', await res.text());
    }
  });

  try {
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="text"]', 'user123');
    await page.fill('input[type="password"]', 'user123');
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:3000/');
    await page.waitForTimeout(2000);
    
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const reportBtn = btns[4]; 
      reportBtn.click();
    });
    await page.waitForTimeout(1000);
    
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => b.style.background.includes('rgb(59, 130, 246)') || b.style.background.includes('#3b82f6'));
      if (btn) btn.click();
    });
    await page.waitForTimeout(1000);
    
    await page.mouse.click(500, 500); 
    await page.waitForTimeout(1000);
    
    await page.evaluate(() => {
       const btns = Array.from(document.querySelectorAll('button'));
       const btn = btns.find(b => b.textContent && b.textContent.includes('tin'));
       if(btn) btn.click();
    });
    
    await page.waitForTimeout(1000);
    
    await page.evaluate(() => {
        const selects = Array.from(document.querySelectorAll('select'));
        if(selects.length > 0) selects[0].value = selects[0].options[1].value;
        const textareas = Array.from(document.querySelectorAll('textarea'));
        if(textareas.length > 0) textareas[0].value = 'Th? nghi?m';
    });

    await page.evaluate(() => {
       const btns = Array.from(document.querySelectorAll('button'));
       const btn = btns.find(b => b.textContent && b.textContent.includes('G'));
       if(btn) btn.click();
    });

    await page.waitForTimeout(3000);
    
  } catch (err) {
    console.error('TEST FAILED:', err);
  } finally {
    await browser.close();
  }
})();
