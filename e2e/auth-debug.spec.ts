import { test, expect } from '@playwright/test';

test('Debug authentication flow', async ({ page }) => {
  console.log('TEST_EMAIL:', process.env.TEST_EMAIL);
  console.log('TEST_PASSWORD:', process.env.TEST_PASSWORD ? '***' : 'NOT SET');

  // Navigate to the application
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Take screenshot of initial page
  await page.screenshot({ path: 'test-results/01-initial-page.png', fullPage: true });

  // Check if login button exists
  const loginButton = page.locator('button:has-text("Iniciar Sesión"), button:has-text("Login"), button[type="submit"]');
  const isLoginVisible = await loginButton.isVisible({ timeout: 5000 }).catch(() => false);

  console.log('Login button visible:', isLoginVisible);

  if (isLoginVisible) {
    // Take screenshot before filling
    await page.screenshot({ path: 'test-results/02-before-fill.png', fullPage: true });

    // Fill in credentials
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');

    await emailInput.fill(process.env.TEST_EMAIL || 'test@example.com');
    await passwordInput.fill(process.env.TEST_PASSWORD || 'password');

    // Take screenshot after filling
    await page.screenshot({ path: 'test-results/03-after-fill.png', fullPage: true });

    // Click submit
    await page.click('button[type="submit"]');

    // Wait for navigation
    await page.waitForTimeout(3000);

    // Take screenshot after submit
    await page.screenshot({ path: 'test-results/04-after-submit.png', fullPage: true });

    // Check current URL
    console.log('Current URL after login:', page.url());

    // Check if there are any error messages
    const errorMessages = await page.locator('[role="alert"], .error, .text-red-500').allTextContents();
    console.log('Error messages:', errorMessages);
  }

  // Navigate to POS
  await page.goto('/pos');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'test-results/05-pos-page.png', fullPage: true });

  console.log('Final URL:', page.url());
});
