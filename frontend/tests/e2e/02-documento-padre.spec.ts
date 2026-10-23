/**
 * Test E2E para documentación técnica: Relacionamiento de Documento Padre
 * 
 * Este test documenta el flujo de vincular un documento padre a otro documento
 * para establecer jerarquías (ej: Contrato vinculado a Pliego de Bases).
 */

import { test, expect } from './fixtures/auth.fixture';
import { DocumentationHelper, OUTPUT_DIRS } from './utils/screenshot-helper';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('02 - Relacionamiento de Documento Padre', () => {
  
  test('Documentar flujo de vincular documento padre', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    const docHelper = new DocumentationHelper(
      page,
      'Relacionamiento de Documento Padre',
      OUTPUT_DIRS.DOCUMENTO_PADRE
    );

    // ============================================
    // PASO 1: Navegar a la sección de documentos
    // ============================================
    await page.click('text=Documentos de Compliance');
    await page.waitForSelector('h2:has-text("Contratos")', { timeout: 10000 });
    await docHelper.documentStep(
      1,
      'Lista de Documentos',
      'Accedemos a la sección de Documentos de Compliance donde se listan todos los documentos legales del sistema.'
    );

    // ============================================
    // PASO 2: Seleccionar un documento
    // ============================================
    // Buscar un documento que NO tenga padre vinculado (usar el de prueba E2E si existe)
    const documentoTarget = await page.locator('h4:has-text("Contrato de Prueba E2E")').first();
    if (await documentoTarget.isVisible()) {
      await documentoTarget.click();
    } else {
      // Si no existe, usar el primer documento disponible que no sea el principal
      await page.locator('[class*="document-card"], [class*="list"] h4').nth(1).click();
    }
    await page.waitForTimeout(1000);
    await docHelper.documentStep(
      2,
      'Documento Seleccionado',
      'Seleccionamos el documento al cual queremos vincular un documento padre. El panel derecho muestra los detalles del documento.'
    );

    // ============================================
    // PASO 3: Ir a la pestaña Relaciones
    // ============================================
    await page.click('button:has-text("Relaciones")');
    await page.waitForTimeout(500);
    await docHelper.documentStep(
      3,
      'Pestaña de Relaciones',
      'En la pestaña "Relaciones" encontramos las opciones para vincular documentos. Aquí podemos establecer jerarquías mediante "Documento Padre" y referencias cruzadas mediante "Documentos Auxiliares".'
    );

    // ============================================
    // PASO 4: Sección de Documento Padre
    // ============================================
    const selectorPadre = page.locator('select, [role="combobox"]').filter({ hasText: /padre/i }).first();
    await selectorPadre.scrollIntoViewIfNeeded();
    await docHelper.documentStep(
      4,
      'Selector de Documento Padre',
      'La sección "Vincular Documento Padre" permite seleccionar un documento que actuará como padre en la jerarquía. Por ejemplo, un Contrato puede tener como padre su Pliego de Bases y Condiciones.'
    );

    // ============================================
    // PASO 5: Seleccionar documento padre del dropdown
    // ============================================
    // Verificar si hay opciones disponibles en el select
    const selectElement = page.locator('select').filter({ hasText: /Seleccionar documento padre/i }).first();
    const isSelectEnabled = await selectElement.isEnabled().catch(() => false);
    
    if (isSelectEnabled) {
      await selectElement.click();
      await page.waitForTimeout(300);
      await docHelper.documentStep(
        5,
        'Opciones de Documento Padre',
        'El desplegable muestra todos los documentos disponibles que pueden ser vinculados como padre. Se excluye el documento actual para evitar referencias circulares.'
      );

      // Seleccionar la primera opción disponible
      const options = await selectElement.locator('option:not([disabled])').all();
      if (options.length > 1) {
        await selectElement.selectOption({ index: 1 });
        await page.waitForTimeout(500);
        await docHelper.documentStep(
          6,
          'Documento Padre Seleccionado',
          'Seleccionamos el documento que queremos establecer como padre. El botón "Vincular" se habilita para confirmar la acción.'
        );

        // ============================================
        // PASO 6: Hacer clic en Vincular
        // ============================================
        const btnVincular = page.locator('button:has-text("Vincular")').first();
        if (await btnVincular.isEnabled()) {
          await btnVincular.click();
          await page.waitForTimeout(1000);
          await docHelper.documentStep(
            7,
            'Documento Padre Vinculado',
            'Al hacer clic en "Vincular", el documento padre queda establecido. Aparece una sección "Documento Padre Vinculado" mostrando la relación creada.'
          );
        }
      }
    } else {
      // Si el documento ya tiene padre, mostrar el estado actual
      await docHelper.documentStep(
        5,
        'Documento Padre Ya Vinculado',
        'Este documento ya tiene un documento padre vinculado. El selector está deshabilitado. Para cambiar el padre, primero debe desvincular el actual usando el botón de eliminar.'
      );
    }

    // ============================================
    // PASO 7: Mostrar el resultado final
    // ============================================
    // Verificar si se muestra el documento padre vinculado
    const padreVinculado = page.locator('h4:has-text("Documento Padre Vinculado")');
    if (await padreVinculado.isVisible()) {
      await docHelper.documentStep(
        8,
        'Relación Establecida',
        'La relación padre-hijo queda establecida. El documento padre aparece listado con su nombre y tipo. Puede desvincularse usando el botón de eliminar (ícono de papelera).'
      );
    }

    // ============================================
    // PASO 8: Verificar impacto en cláusulas
    // ============================================
    await page.click('button:has-text("Cláusulas")');
    await page.waitForTimeout(500);
    
    // Buscar si hay sección de cláusulas del padre
    const clausulasPadre = page.locator('text=/Cláusulas del Documento Padre/i');
    if (await clausulasPadre.isVisible()) {
      await docHelper.documentStep(
        9,
        'Cláusulas Heredadas del Padre',
        'Al tener un documento padre vinculado, las cláusulas del padre pueden visualizarse como referencia. Esto permite mantener coherencia entre documentos relacionados jerárquicamente.'
      );
    }

    // Generar el README final
    await docHelper.generateReadme();
  });
});
