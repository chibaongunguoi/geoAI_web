const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Navigating to http://localhost:3000/');
  await page.goto('http://localhost:3000/');

  // Try to login if required
  try {
    const loginButton = await page.waitForSelector('text="Đăng nhập"', { timeout: 3000 });
    if (loginButton) {
      console.log('Logging in...');
      await page.fill('input[type="text"], input[name="username"]', 'admin');
      await page.fill('input[type="password"]', 'geoai123'); // Standard default password
      await page.click('button[type="submit"], button:has-text("Đăng nhập")');
      await page.waitForTimeout(3000);
    }
  } catch(e) {
    console.log('Login not required or already logged in.');
  }

  // Ensure map is loaded
  await page.waitForTimeout(5000);

  // Click the assets tool icon
  try {
    const assetsButton = await page.$('button[aria-label="Hiển thị tài sản"], button:has(svg.lucide-box)');
    if (assetsButton) {
        console.log('Clicking assets tool icon');
        await assetsButton.click();
        await page.waitForTimeout(1000);
    }
    
    // Toggle the checkbox
    const checkboxLabel = await page.$('text="Hiển thị tài sản trên bản đồ"');
    if (checkboxLabel) {
       await checkboxLabel.click();
       console.log('Toggled checkbox OFF');
       await page.waitForTimeout(1000);
       await checkboxLabel.click();
       console.log('Toggled checkbox ON');
    }
  } catch(e) {
    console.log('Could not find toggle:', e.message);
  }

  await page.waitForTimeout(5000);

  // Take a screenshot
  const screenshotPath = path.join(__dirname, 'playwright_screenshot.png');
  await page.screenshot({ path: screenshotPath });
  console.log('Saved screenshot to:', screenshotPath);

  // Check for markers
  const markers = await page.$$('.poi-marker, .poi-cluster');
  console.log(`Found ${markers.length} POI markers/clusters on the map.`);

  // Check network requests for /api/poi/search
  // We didn't setup intercept before, so let's do it quickly by reloading
  let poiResponseCount = 0;
  page.on('response', async (response) => {
    if (response.url().includes('/api/poi/search')) {
      poiResponseCount++;
      const json = await response.json().catch(() => ({}));
      console.log(`POI Search API returned ${json.items?.length} items`);
    }
  });

  // Pan the map to trigger a request
  console.log('Panning the map to trigger fetch...');
  const mapElement = await page.$('.geoai-map');
  if (mapElement) {
    const boundingBox = await mapElement.boundingBox();
    await page.mouse.move(boundingBox.x + boundingBox.width / 2, boundingBox.y + boundingBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(boundingBox.x + boundingBox.width / 2 + 100, boundingBox.y + boundingBox.height / 2 + 100);
    await page.mouse.up();
  }

  await page.waitForTimeout(4000);
  console.log(`Intercepted ${poiResponseCount} POI search requests.`);

  await browser.close();
})();
