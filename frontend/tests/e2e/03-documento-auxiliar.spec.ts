/**
 * Test E2E para documentación técnica: Documento Auxiliar
 * 
 * Este test documenta el flujo de vincular documentos auxiliares
 * para establecer referencias cruzadas entre cláusulas de diferentes documentos.
 */

import { test, expect } from './fixtures/auth.fixture';
import { DocumentationHelper, OUTPUT_DIRS } from './utils/screenshot-helper';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('03 - Documentos Auxiliares', () => {
  
  test('Documentar flujo de vincular documento auxiliar', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    const docHelper = new DocumentationHelper(
      page,
      'Documentos Auxiliares',
      OUTPUT_DIRS.DOCUMENTO_AUXILIAR
    );

    // ============================================
    // PASO 1: Navegar a la sección de documentos
    // ============================================
    await page.click('text=Documentos de Compliance');
    await page.waitForSelector('h2:has-text("Contratos")', { timeout: 10000 });
    await docHelper.documentStep(
      1,
      'Lista de Documentos',
      'Accedemos a la sección de Documentos de Compliance. Los documentos auxiliares permiten crear referencias cruzadas entre cláusulas de diferentes documentos.'
    );

    // ============================================
    // PASO 2: Seleccionar el documento principal
    // ============================================
    // Seleccionar el Contrato de Servicios que tiene auxiliares
    const documentoPrincipal = page.locator('h4:has-text("Contrato de Servicios")').first();
    await documentoPrincipal.click();
    await page.waitForTimeout(1000);
    await docHelper.documentStep(
      2,
      'Documento Principal Seleccionado',
      'Seleccionamos el documento principal al cual queremos vincular documentos auxiliares. Los auxiliares sirven para referenciar cláusulas de otros documentos relacionados.'
    );

    // ============================================
    // PASO 3: Ir a la pestaña Relaciones
    // ============================================
    await page.click('button:has-text("Relaciones")');
    await page.waitForTimeout(500);
    await docHelper.documentStep(
      3,
      'Pestaña de Relaciones',
      'En la pestaña "Relaciones" encontramos la sección de "Documentos Auxiliares" debajo de la sección de documento padre.'
    );

    // ============================================
    // PASO 4: Sección de Documentos Auxiliares
    // ============================================
    const seccionAuxiliares = page.locator('h4:has-text("Documentos Auxiliares")');
    await seccionAuxiliares.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await docHelper.documentStep(
      4,
      'Sección Documentos Auxiliares',
      'La sección "Documentos Auxiliares" permite vincular múltiples documentos para referencias cruzadas. A diferencia del documento padre (relación única), pueden existir varios auxiliares.'
    );

    // ============================================
    // PASO 5: Ver auxiliares ya vinculados
    // ============================================
    const auxiliaresExistentes = page.locator('text=/auto_stories/').first();
    if (await auxiliaresExistentes.isVisible()) {
      await docHelper.documentStep(
        5,
        'Documentos Auxiliares Vinculados',
        'Se muestran los documentos auxiliares ya vinculados. Cada uno aparece con su nombre, tipo (CONTRATO, LEYES_REGULACIONES, etc.) y un botón para desvincular.'
      );
    }

    // ============================================
    // PASO 6: Seleccionar nuevo auxiliar
    // ============================================
    const selectAuxiliar = page.locator('select').filter({ hasText: /auxiliar/i }).first();
    if (await selectAuxiliar.isVisible()) {
      await selectAuxiliar.click();
      await page.waitForTimeout(300);
      await docHelper.documentStep(
        6,
        'Selector de Documento Auxiliar',
        'El desplegable muestra los documentos disponibles para vincular como auxiliar. Se excluyen el documento actual y los ya vinculados.'
      );

      // Intentar seleccionar una opción
      const options = await selectAuxiliar.locator('option:not([disabled])').all();
      if (options.length > 1) {
        await selectAuxiliar.selectOption({ index: 1 });
        await page.waitForTimeout(500);
        await docHelper.documentStep(
          7,
          'Auxiliar Seleccionado',
          'Al seleccionar un documento del desplegable, el botón "Vincular" se habilita para confirmar la creación de la relación auxiliar.'
        );
      }
    }

    // ============================================
    // PASO 7: Mostrar uso en cláusulas
    // ============================================
    await page.click('button:has-text("Cláusulas")');
    await page.waitForTimeout(500);
    await docHelper.documentStep(
      8,
      'Cláusulas del Documento',
      'Al vincular documentos auxiliares, las cláusulas del documento principal pueden referenciar cláusulas de los auxiliares. Esto es útil para contratos que dependen de leyes o regulaciones específicas.'
    );

    // ============================================
    // PASO 8: Buscar cláusula con referencia a auxiliar
    // ============================================
    // Buscar una cláusula que tenga relaciones con otro documento
    const clausulaConRelacion = page.locator('text=Cláusulas Relacionadas').first();
    if (await clausulaConRelacion.isVisible()) {
      await clausulaConRelacion.scrollIntoViewIfNeeded();
      await docHelper.documentStep(
        9,
        'Cláusulas Relacionadas',
        'Las cláusulas pueden tener referencias a cláusulas de documentos auxiliares. Se muestra el tipo de relación (REFERENCIA, COMPLEMENTO, etc.) y permite navegar al documento relacionado.'
      );
    }

    // ============================================
    // PASO 9: Ver el grafo de relaciones
    // ============================================
    await page.click('button:has-text("Grafo")');
    await page.waitForTimeout(1500); // Esperar a que cargue el grafo
    await docHelper.documentStep(
      10,
      'Grafo de Relaciones',
      'El grafo visual muestra las conexiones entre cláusulas del documento y los documentos auxiliares. Las líneas representan las referencias cruzadas establecidas.'
    );

    // Generar el README final
    await docHelper.generateReadme();
  });
});
