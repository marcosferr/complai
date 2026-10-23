/**
 * Test E2E para documentación técnica: Referencia de Cláusulas
 * 
 * Este test documenta el flujo de crear referencias entre cláusulas
 * de diferentes documentos (REFERENCIA, COMPLEMENTO, MODIFICACION, etc.).
 */

import { test, expect } from './fixtures/auth.fixture';
import { DocumentationHelper, OUTPUT_DIRS } from './utils/screenshot-helper';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('04 - Referencia de Cláusulas', () => {
  
  test('Documentar flujo de vincular cláusulas entre documentos', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    const docHelper = new DocumentationHelper(
      page,
      'Referencia de Cláusulas',
      OUTPUT_DIRS.REFERENCIA_CLAUSULAS
    );

    // ============================================
    // PASO 1: Navegar a documentos
    // ============================================
    await page.click('text=Documentos de Compliance');
    await page.waitForSelector('h2:has-text("Contratos")', { timeout: 10000 });
    await docHelper.documentStep(
      1,
      'Lista de Documentos',
      'Accedemos a la sección de Documentos donde estableceremos referencias entre cláusulas de diferentes documentos.'
    );

    // ============================================
    // PASO 2: Seleccionar documento con cláusulas
    // ============================================
    const documentoPrincipal = page.locator('h4:has-text("Contrato de Servicios")').first();
    await documentoPrincipal.click();
    await page.waitForTimeout(1000);
    await docHelper.documentStep(
      2,
      'Documento con Cláusulas',
      'Seleccionamos un documento que tenga cláusulas. El panel derecho muestra las cláusulas del documento seleccionado.'
    );

    // ============================================
    // PASO 3: Verificar pestaña de Cláusulas
    // ============================================
    await page.click('button:has-text("Cláusulas")');
    await page.waitForTimeout(500);
    await docHelper.documentStep(
      3,
      'Lista de Cláusulas',
      'En la pestaña "Cláusulas" vemos todas las cláusulas del documento. Cada cláusula puede tener relaciones con cláusulas de otros documentos.'
    );

    // ============================================
    // PASO 4: Identificar botón de vincular cláusula
    // ============================================
    const btnVincular = page.locator('button[description*="Vincular Cláusula"], button:has-text("link")').first();
    if (await btnVincular.isVisible()) {
      await btnVincular.scrollIntoViewIfNeeded();
      await docHelper.documentStep(
        4,
        'Botón Vincular Cláusula',
        'Cada cláusula tiene un botón "Vincular" (ícono de enlace) que permite crear referencias a cláusulas de otros documentos auxiliares.'
      );
    }

    // ============================================
    // PASO 5: Abrir modal de vinculación
    // ============================================
    if (await btnVincular.isVisible()) {
      await btnVincular.click();
      await page.waitForTimeout(500);
      
      // Buscar el modal
      const modal = page.locator('[role="dialog"], .modal, [class*="modal"]');
      if (await modal.isVisible()) {
        await docHelper.documentStep(
          5,
          'Modal de Vinculación',
          'Se abre un modal para crear la referencia. Aquí seleccionamos el documento auxiliar, la cláusula objetivo y el tipo de relación.'
        );

        // ============================================
        // PASO 6: Seleccionar documento auxiliar
        // ============================================
        const selectDoc = modal.locator('select').first();
        if (await selectDoc.isVisible()) {
          await selectDoc.click();
          await page.waitForTimeout(300);
          await docHelper.documentStep(
            6,
            'Seleccionar Documento Auxiliar',
            'El primer selector muestra los documentos auxiliares vinculados. Solo podemos referenciar cláusulas de documentos previamente establecidos como auxiliares.'
          );

          // Seleccionar opción si hay
          const options = await selectDoc.locator('option').all();
          if (options.length > 1) {
            await selectDoc.selectOption({ index: 1 });
            await page.waitForTimeout(500);
          }
        }

        // ============================================
        // PASO 7: Seleccionar cláusula destino
        // ============================================
        const selectClausula = modal.locator('select').nth(1);
        if (await selectClausula.isVisible()) {
          await docHelper.documentStep(
            7,
            'Seleccionar Cláusula Destino',
            'El segundo selector muestra las cláusulas del documento auxiliar seleccionado. Elegimos la cláusula a la que queremos hacer referencia.'
          );
        }

        // ============================================
        // PASO 8: Seleccionar tipo de relación
        // ============================================
        const selectTipo = modal.locator('select').nth(2);
        if (await selectTipo.isVisible()) {
          await docHelper.documentStep(
            8,
            'Tipo de Relación',
            'Seleccionamos el tipo de relación: REFERENCIA (cita simple), COMPLEMENTO (amplía el contenido), MODIFICACION (altera la cláusula original), DEPENDENCIA (requiere la otra), CONTRADICCION (conflicto).'
          );
        }

        // Cerrar modal
        const btnCerrar = modal.locator('button:has-text("Cerrar"), button:has-text("Cancelar"), [aria-label="close"]').first();
        if (await btnCerrar.isVisible()) {
          await btnCerrar.click();
          await page.waitForTimeout(300);
        }
      }
    }

    // ============================================
    // PASO 9: Ver cláusulas con relaciones existentes
    // ============================================
    // Buscar una cláusula que ya tenga relaciones
    const clausulaRelacionada = page.locator('text=Cláusulas Relacionadas').first();
    if (await clausulaRelacionada.isVisible()) {
      await clausulaRelacionada.scrollIntoViewIfNeeded();
      await docHelper.documentStep(
        9,
        'Cláusulas Relacionadas Existentes',
        'Las cláusulas que tienen referencias muestran una sección "Cláusulas Relacionadas" con el tipo de relación (REFERENCIA, COMPLEMENTO) y el nombre de la cláusula relacionada.'
      );
    }

    // ============================================
    // PASO 10: Mostrar navegación a cláusula relacionada
    // ============================================
    const btnIrClausula = page.locator('button[description*="Ir a cláusula"]').first();
    if (await btnIrClausula.isVisible()) {
      await btnIrClausula.scrollIntoViewIfNeeded();
      await docHelper.documentStep(
        10,
        'Navegación a Cláusula Relacionada',
        'Cada relación tiene botones para ver la vista previa (ícono ojo) o navegar directamente a la cláusula relacionada (flecha). Esto facilita la revisión de referencias cruzadas.'
      );
    }

    // ============================================
    // PASO 11: Ver grafo de relaciones
    // ============================================
    await page.click('button:has-text("Grafo")');
    await page.waitForTimeout(1500);
    await docHelper.documentStep(
      11,
      'Visualización en Grafo',
      'El grafo muestra visualmente todas las relaciones entre cláusulas. Los nodos representan cláusulas y las líneas las referencias, con colores según el tipo de relación.'
    );

    // Generar el README final
    await docHelper.generateReadme();
  });
});
