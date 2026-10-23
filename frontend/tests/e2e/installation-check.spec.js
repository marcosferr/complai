import { test, expect } from '@playwright/test';

test('playwright installation check', async ({ page }) => {
  // Simple test to verify Playwright is working
  test.setTimeout(5000);
  
  // Just verify we can create a page context
  expect(page).toBeDefined();
  
  // Verify we can navigate to a simple URL
  await page.goto('about:blank');
  
  // Verify page title
  const title = await page.title();
  expect(title).toBe('');
  
  console.log('✅ Playwright installation verified successfully!');
});