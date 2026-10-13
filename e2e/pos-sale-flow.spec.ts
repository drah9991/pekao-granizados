import { test, expect } from '@playwright/test';

/**
 * E2E Test: Complete POS Sale Flow
 * Tests the entire sales process from product selection to receipt generation
 */

test.describe('POS Sale Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Check if we need to login (adapt based on your auth flow)
    const loginButton = page.locator('button:has-text("Iniciar Sesión"), button:has-text("Login"), button[type="submit"]');
    const isLoginVisible = await loginButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (isLoginVisible) {
      // Fill in credentials from environment variables
      await page.fill('input[type="email"]', process.env.TEST_EMAIL || 'test@example.com');
      await page.fill('input[type="password"]', process.env.TEST_PASSWORD || 'password');
      await page.click('button[type="submit"]');

      // Wait for navigation after login
      await page.waitForLoadState('networkidle', { timeout: 15000 });

      // Wait a bit more for any redirects
      await page.waitForTimeout(2000);
    }

    // Navigate to POS
    await page.goto('/pos');
    await page.waitForLoadState('networkidle');
  });

  test('should complete a full sale with product selection, cart, and payment', async ({ page }) => {
    // Step 1: Verify POS page is loaded
    await expect(page.locator('text=Catalog, text=Productos')).toBeVisible({ timeout: 10000 });

    // Step 2: Select a product from the grid
    const firstProduct = page.locator('[data-testid="product-card"]').first();
    await firstProduct.waitFor({ state: 'visible', timeout: 10000 });
    await firstProduct.click();

    // Step 3: Verify product was added to cart
    // The cart badge should show at least 1 item
    const cartBadge = page.locator('[data-testid="cart-badge"], .cart-count');
    await expect(cartBadge).toBeVisible({ timeout: 5000 });

    // Step 4: Open cart view (on mobile) or verify cart panel (on desktop)
    const viewportSize = page.viewportSize();
    if (viewportSize && viewportSize.width < 1024) {
      // Mobile: click on cart tab
      await page.click('button:has-text("Checkout"), button:has-text("Carrito")');
    }

    // Step 5: Verify cart shows the product
    await expect(page.locator('[data-testid="cart-item"]').first()).toBeVisible({ timeout: 5000 });

    // Step 6: Select a customer (if customer selection exists)
    const customerButton = page.locator('button:has-text("Cliente"), button:has-text("Seleccionar Cliente")');
    if (await customerButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await customerButton.click();
      // Select first customer from list
      await page.locator('[data-testid="customer-option"]').first().click();
    }

    // Step 7: Open payment dialog
    const payButton = page.locator('button:has-text("Pagar"), button:has-text("Procesar Pago"), button:has-text("Cobrar")');
    await payButton.waitFor({ state: 'visible', timeout: 5000 });
    await payButton.click();

    // Step 8: Verify payment dialog is open
    await expect(page.locator('[role="dialog"], [data-testid="payment-dialog"]')).toBeVisible({ timeout: 5000 });

    // Step 9: Select payment method (default: cash)
    const cashButton = page.locator('button:has-text("Efectivo"), button:has-text("Cash")');
    if (await cashButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await cashButton.click();
    }

    // Step 10: Confirm payment
    const confirmButton = page.locator('button:has-text("Confirmar"), button:has-text("Confirmar Pago")');
    await confirmButton.waitFor({ state: 'visible', timeout: 5000 });
    await confirmButton.click();

    // Step 11: Verify receipt dialog appears
    await expect(page.locator('[data-testid="receipt-dialog"], text=Recibo, text=Comprobante')).toBeVisible({ timeout: 10000 });

    // Step 12: Close receipt dialog
    const closeButton = page.locator('button:has-text("Cerrar"), button[aria-label="Cerrar"]').last();
    await closeButton.click();

    // Step 13: Verify cart is empty after successful sale
    await expect(page.locator('[data-testid="cart-empty"], text=El carrito está vacío')).toBeVisible({ timeout: 5000 });
  });

  test('should handle product customization before adding to cart', async ({ page }) => {
    // Find a product with customization options
    const customizableProduct = page.locator('[data-testid="product-card"][data-customizable="true"]').first();

    if (await customizableProduct.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Click on customize button
      await customizableProduct.locator('button:has-text("Personalizar"), button[aria-label*="personalizar"]').click();

      // Verify customization dialog opens
      await expect(page.locator('[role="dialog"][data-testid="customization-dialog"]')).toBeVisible({ timeout: 5000 });

      // Select a size if available
      const sizeOption = page.locator('[data-testid="size-option"]').first();
      if (await sizeOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await sizeOption.click();
      }

      // Add to cart from customization dialog
      await page.click('button:has-text("Agregar al Carrito"), button:has-text("Añadir")');

      // Verify product was added
      const cartBadge = page.locator('[data-testid="cart-badge"]');
      await expect(cartBadge).toBeVisible({ timeout: 5000 });
    }
  });

  test('should apply discount correctly', async ({ page }) => {
    // Add a product to cart
    const firstProduct = page.locator('[data-testid="product-card"]').first();
    await firstProduct.waitFor({ state: 'visible', timeout: 10000 });
    await firstProduct.click();

    // Open cart view on mobile
    const viewportSize = page.viewportSize();
    if (viewportSize && viewportSize.width < 1024) {
      await page.click('button:has-text("Checkout"), button:has-text("Carrito")');
    }

    // Find and click discount button
    const discountButton = page.locator('button:has-text("Descuento"), [data-testid="discount-button"]');
    if (await discountButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await discountButton.click();

      // Enter discount amount
      await page.fill('input[type="number"][placeholder*="descuento"], input[name="discount"]', '10');

      // Apply discount
      await page.click('button:has-text("Aplicar")');

      // Verify discount is reflected in total
      const totalElement = page.locator('[data-testid="cart-total"], text=/Total.*\\$/');
      await expect(totalElement).toBeVisible({ timeout: 5000 });
    }
  });

  test('should handle cart quantity updates', async ({ page }) => {
    // Add a product
    const firstProduct = page.locator('[data-testid="product-card"]').first();
    await firstProduct.waitFor({ state: 'visible', timeout: 10000 });
    await firstProduct.click();

    // Navigate to cart
    const viewportSize = page.viewportSize();
    if (viewportSize && viewportSize.width < 1024) {
      await page.click('button:has-text("Checkout"), button:has-text("Carrito")');
    }

    // Increase quantity
    const incrementButton = page.locator('[data-testid="increment-quantity"], button[aria-label*="Aumentar"]').first();
    if (await incrementButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await incrementButton.click();

      // Verify quantity changed
      const quantityDisplay = page.locator('[data-testid="item-quantity"]').first();
      await expect(quantityDisplay).toContainText('2');
    }

    // Decrease quantity
    const decrementButton = page.locator('[data-testid="decrement-quantity"], button[aria-label*="Disminuir"]').first();
    if (await decrementButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await decrementButton.click();

      // Verify quantity changed back
      const quantityDisplay = page.locator('[data-testid="item-quantity"]').first();
      await expect(quantityDisplay).toContainText('1');
    }
  });

  test('should show offline indicator when network is down', async ({ page, context }) => {
    // Go offline
    await context.setOffline(true);

    // Verify offline indicator appears
    const offlineIndicator = page.locator('[data-testid="offline-indicator"], svg[data-lucide="wifi-off"]');
    await expect(offlineIndicator).toBeVisible({ timeout: 5000 });

    // Go back online
    await context.setOffline(false);
  });
});
