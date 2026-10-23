# Pruebas End-to-End con Playwright

Este directorio contiene las pruebas end-to-end (e2e) para la aplicación Compliance Hub utilizando Playwright.

## Configuración

Playwright ya está configurado en el proyecto con:
- Archivo de configuración: `playwright.config.js`
- Navegadores soportados: Chromium, Firefox, WebKit
- Servidor de desarrollo configurado para iniciar automáticamente

## Scripts Disponibles

- `npm run test:e2e` - Ejecuta todas las pruebas e2e en modo headless
- `npm run test:e2e:ui` - Ejecuta las pruebas con la interfaz visual de Playwright
- `npm run test:e2e:headed` - Ejecuta las pruebas en modo headed (puedes ver el navegador)

## Ejecutar Pruebas

### Ejecutar todas las pruebas:
```bash
npm run test:e2e
```

### Ejecutar pruebas en modo UI (recomendado para desarrollo):
```bash
npm run test:e2e:ui
```

### Ejecutar pruebas en modo headed (para depuración):
```bash
npm run test:e2e:headed
```

### Ejecutar una prueba específica:
```bash
npx playwright test tests/e2e/example.spec.js
```

### Ejecutar pruebas en un navegador específico:
```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

## Generar Reportes

Después de ejecutar las pruebas, puedes ver el reporte HTML:
```bash
npx playwright show-report
```

## Grabar Nuevas Pruebas

Puedes grabar nuevas pruebas fácilmente:
```bash
npx playwright codegen http://localhost:5173
```

## Depuración

Para depurar pruebas, puedes usar:
- Modo UI: `npm run test:e2e:ui`
- Puntos de ruptura: añade `await page.pause()` en tu prueba
- Modo headed: `npm run test:e2e:headed`

## Estructura de Pruebas

Las pruebas deben seguir la estructura:
```
tests/e2e/
├── auth/
│   └── login.spec.js
├── dashboard/
│   └── dashboard.spec.js
├── documentos/
│   └── documentos.spec.js
└── tareas/
    └── tareas.spec.js
```

## Buenas Prácticas

1. Usa selectores de Playwright recomendados:
   - `page.getByRole()` para elementos accesibles
   - `page.getByText()` para texto visible
   - `page.getByLabel()` para elementos con etiquetas
   - `page.getByPlaceholder()` para placeholders

2. Usa `test.describe()` para agrupar pruebas relacionadas

3. Usa `test.beforeEach()` para configuración común

4. Usa fixtures de Playwright para datos de prueba

5. Mantén las pruebas independientes entre sí

## Ejemplo de Prueba

```javascript
import { test, expect } from '@playwright/test';

test.describe('Autenticación', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('iniciar sesión correctamente', async ({ page }) => {
    await page.getByLabel('Usuario').fill('test@example.com');
    await page.getByLabel('Contraseña').fill('password123');
    await page.getByRole('button', { name: 'Iniciar Sesión' }).click();
    
    await expect(page.getByText('Dashboard')).toBeVisible();
  });
});