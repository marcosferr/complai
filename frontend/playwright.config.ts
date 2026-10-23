import { defineConfig, devices } from '@playwright/test';

/**
 * Configuración de Playwright para documentación técnica
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e',
  
  /* Ejecutar tests secuencialmente para documentación */
  fullyParallel: false,
  
  /* No fallar en CI si hay .only */
  forbidOnly: !!process.env.CI,
  
  /* Sin reintentos para documentación */
  retries: 0,
  
  /* Un solo worker para consistencia */
  workers: 1,
  
  /* Reporter HTML para revisión */
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list']
  ],
  
  /* Configuración compartida para todos los tests */
  use: {
    /* URL base del frontend */
    baseURL: 'http://localhost:3000',
    
    /* Capturar trace en primer reintento */
    trace: 'on-first-retry',
    
    /* IMPORTANTE: Grabar video siempre para documentación */
    video: {
      mode: 'retain-on-failure', // Solo guardar si falla para debug, el video demo se genera por separado
      size: { width: 1280, height: 720 }
    },
    
    /* Capturar screenshots en cada paso */
    screenshot: 'on',
    
    /* Viewport consistente para documentación */
    viewport: { width: 1280, height: 720 },
    
    /* Locale en español */
    locale: 'es-ES',
    
    /* Timezone Paraguay */
    timezoneId: 'America/Asuncion',
  },

  /* Configurar proyecto para Chrome */
  projects: [
    {
      name: 'documentation',
      use: { 
        ...devices['Desktop Chrome'],
        // Forzar modo visible para grabación
        headless: false,
      },
    },
  ],

  /* Directorio de salida para artifacts */
  outputDir: 'test-results/',
  
  /* Timeout extendido para pasos de documentación */
  timeout: 60000,
  
  /* Expect timeout */
  expect: {
    timeout: 10000,
  },
});
