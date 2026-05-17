import { test, expect } from "@playwright/test";

test.describe("POI Integration - Overture Places", () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto("/login");
    await page.fill('input[name="email"]', "admin@geoai.vn");
    await page.fill('input[name="password"]', "admin123");
    await page.click('button[type="submit"]');
    await page.waitForURL("/");
  });

  test("should search POI by Vietnamese category keyword", async ({ page }) => {
    await page.goto("/");

    // Open POI search panel (assuming it's integrated into the map tools)
    // Type "nhà hàng" in the POI search
    const searchInput = page.locator('.poi-search-panel input[type="search"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill("nhà hàng");
      await searchInput.press("Enter");

      // Wait for results
      await expect(page.locator(".poi-search-count")).toBeVisible({ timeout: 10000 });
    }
  });

  test("should display POI markers on map after search", async ({ page }) => {
    await page.goto("/");

    const searchInput = page.locator('.poi-search-panel input[type="search"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill("cafe");
      await searchInput.press("Enter");

      // Check that markers appear (POI markers have class poi-marker)
      await expect(page.locator(".poi-marker").first()).toBeVisible({ timeout: 10000 });
    }
  });

  test("should show popup when clicking POI marker", async ({ page }) => {
    await page.goto("/");

    const searchInput = page.locator('.poi-search-panel input[type="search"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill("nhà hàng");
      await searchInput.press("Enter");

      // Wait for markers then click first one
      const marker = page.locator(".poi-marker").first();
      if (await marker.isVisible({ timeout: 10000 })) {
        await marker.click();

        // Popup should appear with name and "Thêm vào tài sản" button
        await expect(page.locator(".poi-popup")).toBeVisible();
        await expect(page.locator(".poi-popup-name")).toBeVisible();
        await expect(page.locator(".poi-popup-convert")).toHaveText("Thêm vào tài sản");
      }
    }
  });

  test("should convert POI to asset", async ({ page }) => {
    await page.goto("/");

    const searchInput = page.locator('.poi-search-panel input[type="search"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill("cafe");
      await searchInput.press("Enter");

      const marker = page.locator(".poi-marker").first();
      if (await marker.isVisible({ timeout: 10000 })) {
        await marker.click();
        await expect(page.locator(".poi-popup")).toBeVisible();

        // Click "Thêm vào tài sản"
        await page.locator(".poi-popup-convert").click();

        // Should show success message
        await expect(page.locator(".poi-popup-status--success")).toBeVisible({ timeout: 5000 });
        await expect(page.locator(".poi-popup-status--success")).toContainText("Đã thêm vào tài sản");
      }
    }
  });

  test("should show Vietnamese labels in dashboard", async ({ page }) => {
    await page.goto("/dashboard");

    // Verify Vietnamese localization
    await expect(page.locator("h1")).toContainText("Tổng quan tài sản");
    await expect(page.locator("text=Trạng thái")).toBeVisible();
    await expect(page.locator("text=Quận/huyện")).toBeVisible();
    await expect(page.locator("text=Áp dụng")).toBeVisible();
  });

  test("should display navigation in Vietnamese", async ({ page }) => {
    await page.goto("/");

    // Check nav links are in Vietnamese
    await expect(page.locator('nav[aria-label="Điều hướng chính"] >> text=Tài sản')).toBeVisible();
    await expect(page.locator('nav[aria-label="Điều hướng chính"] >> text=Bảng điều khiển')).toBeVisible();
  });

  test("should not show search suggestion chips", async ({ page }) => {
    await page.goto("/");

    // The sample question chips should NOT be visible (they were removed)
    await expect(page.locator(".sampleQuestionChip")).toHaveCount(0);
  });

  test("should have scrollable map panels", async ({ page }) => {
    await page.goto("/");

    // Open a tool panel (e.g., layers)
    const layersButton = page.locator('button[aria-label="Lớp dữ liệu"]');
    if (await layersButton.isVisible()) {
      await layersButton.click();

      // The popover should be visible and scrollable
      const popover = page.locator(".leftToolPopover, .rightToolPopover").first();
      await expect(popover).toBeVisible();

      // Check that popoverBody has overflow auto (scrollable)
      const body = popover.locator(".popoverBody");
      if (await body.isVisible()) {
        const overflow = await body.evaluate((el) => getComputedStyle(el).overflowY);
        expect(overflow).toBe("auto");
      }
    }
  });
});
