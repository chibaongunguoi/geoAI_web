const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Navigating to http://localhost:3000/login');
  await page.goto('http://localhost:3000/login');

  await page.fill('input[type="text"]', 'manager123'); 
  await page.fill('input[type="password"]', 'manager123');
  await page.click('button[type="submit"]');

  await page.waitForURL('http://localhost:3000/');
  console.log('Logged in successfully!');

  // Wait for map to load
  await page.waitForTimeout(2000);

  // Monitor network for map/assets
  let assetsLoaded = false;
  page.on('response', async (response) => {
    if (response.url().includes('/api/poi/search')) {
      console.log('Received response from /api/poi/search: ' + response.status());
      try {
        const json = await response.json();
        console.log('Assets returned:', json.items?.length || 0);
        assetsLoaded = true;
      } catch (e) {
        console.log('Could not parse JSON:', e.message);
      }
    }
  });

  const buttons = await page.locator('.geoai-sidebar-icon').elementHandles();
  if (buttons.length > 0) {
      // The POI checkbox is in the 4th panel (assets panel)
      await buttons[3].click();
      await page.waitForTimeout(500);
  }

  console.log('Looking for the checkbox "Hiển thị tài sản trên bản đồ"...');
  
  try {
      const checkboxLabel = page.locator('label', { hasText: 'Hiển thị tài sản trên bản đồ' });
      const isVisible = await checkboxLabel.isVisible();
      
      const isChecked = await checkboxLabel.locator('input[type="checkbox"]').isChecked();
      if (!isChecked) {
          await checkboxLabel.click();
          console.log('Clicked the checkbox!');
      } else {
          console.log('Checkbox is already checked. Unchecking and checking again to trigger request...');
          await checkboxLabel.click();
          await page.waitForTimeout(500);
          await checkboxLabel.click();
      }
  } catch(e) {
      console.log('Could not interact with checkbox:', e);
  }

  console.log('Waiting 5 seconds for data to load...');
  await page.waitForTimeout(5000);

  const screenshotPath = path.resolve(__dirname, 'screenshot3.png');
  await page.screenshot({ path: screenshotPath });
  console.log('Saved screenshot to:', screenshotPath);
  console.log('Assets loaded flag:', assetsLoaded);

  await browser.close();
})();
