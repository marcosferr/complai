import { test as base, Page } from '@playwright/test';

// Credenciales de administrador
export const ADMIN_CREDENTIALS = {
  email: 'admin@compliance.com',
  password: 'admin123',
};

// Verifica si el usuario ya está logueado (detecta el dashboard o sidebar)
async function isAlreadyLoggedIn(page: Page): Promise<boolean> {
  try {
    // Busca elementos que solo aparecen cuando el usuario está logueado
    const loggedInIndicator = await page.locator('text=Cerrar Sesión, text=Dashboard, nav >> text=Obligaciones').first();
    return await loggedInIndicator.isVisible({ timeout: 2000 });
  } catch {
    return false;
  }
}

// Fixture para autenticación
export const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ page }, use) => {
    // Navegar a la raíz primero para verificar estado
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Verificar si ya está logueado
    const alreadyLoggedIn = await isAlreadyLoggedIn(page);
    
    if (!alreadyLoggedIn) {
      // Navegar al login
      await page.goto('/login');
      
      // Esperar a que cargue el formulario - el campo se llama "username" no "email"
      await page.waitForSelector('input[name="username"], input#username', { timeout: 10000 });
      
      // Completar credenciales
      await page.fill('input[name="username"], input#username', ADMIN_CREDENTIALS.email);
      await page.fill('input[name="password"], input#password', ADMIN_CREDENTIALS.password);
      
      // Click en login
      await page.click('button[type="submit"]');
      
      // Esperar redirección al dashboard (la app redirige a "/" no "/dashboard")
      await page.waitForURL(/\/$/, { timeout: 15000 });
    }
    
    // Usar la página autenticada
    await use(page);
  },
});

export { expect } from '@playwright/test';

// Helper function para login manual (para tests que no usan fixture)
export async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  // Verificar si ya está logueado
  const loggedIn = await isAlreadyLoggedIn(page);
  
  if (!loggedIn) {
    await page.goto('/login');
    await page.waitForSelector('input[name="username"], input#username', { timeout: 10000 });
    await page.fill('input[name="username"], input#username', ADMIN_CREDENTIALS.email);
    await page.fill('input[name="password"], input#password', ADMIN_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/$/, { timeout: 15000 });
  }
}

// Verifica si el usuario ya está logueado (exportado para uso externo)
export { isAlreadyLoggedIn };
