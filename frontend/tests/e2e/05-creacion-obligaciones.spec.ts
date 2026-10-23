/**
 * Test E2E para documentación técnica: Creación de Obligaciones
 * 
 * Este test documenta el flujo completo de crear obligaciones (tareas de cumplimiento)
 * a partir de las cláusulas de un documento legal.
 */

import { test, expect } from './fixtures/auth.fixture';
import { DocumentationHelper, OUTPUT_DIRS } from './utils/screenshot-helper';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('05 - Creación de Obligaciones', () => {
  
  test('Documentar flujo de crear obligación desde cláusula', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    const docHelper = new DocumentationHelper(
      page,
      'Creación de Obligaciones',
      OUTPUT_DIRS.CREACION_OBLIGACIONES
    );

    // ============================================
    // PASO 1: Navegar a documentos
    // ============================================
    await page.click('text=Documentos de Compliance');
    await page.waitForSelector('h2:has-text("Contratos")', { timeout: 10000 });
    await docHelper.documentStep(
      1,
      'Lista de Documentos',
      'Las obligaciones nacen de las cláusulas de los documentos legales. Accedemos a Documentos de Compliance para crear una nueva obligación.'
    );

    // ============================================
    // PASO 2: Seleccionar documento
    // ============================================
    const documentoPrincipal = page.locator('h4:has-text("Contrato de Servicios")').first();
    await documentoPrincipal.click();
    await page.waitForTimeout(1000);
    await docHelper.documentStep(
      2,
      'Documento Seleccionado',
      'Seleccionamos el documento del cual extraeremos la obligación. Las obligaciones se crean a nivel de cláusula específica.'
    );

    // ============================================
    // PASO 3: Ver cláusulas del documento
    // ============================================
    await page.click('button:has-text("Cláusulas")');
    await page.waitForTimeout(500);
    await docHelper.documentStep(
      3,
      'Cláusulas del Documento',
      'Cada cláusula puede generar una o más obligaciones. Las obligaciones son tareas que deben cumplirse según lo establecido en la cláusula.'
    );

    // ============================================
    // PASO 4: Localizar sección de obligaciones
    // ============================================
    const seccionObligaciones = page.locator('text=Obligaciones:').first();
    if (await seccionObligaciones.isVisible()) {
      await seccionObligaciones.scrollIntoViewIfNeeded();
      await docHelper.documentStep(
        4,
        'Sección de Obligaciones',
        'Cada cláusula tiene una sección "Obligaciones" donde se listan las obligaciones ya creadas y un botón para agregar nuevas.'
      );
    }

    // ============================================
    // PASO 5: Hacer clic en Agregar Obligación
    // ============================================
    const btnAgregarObligacion = page.locator('button:has-text("Agregar Obligación")').first();
    await btnAgregarObligacion.scrollIntoViewIfNeeded();
    await docHelper.documentStep(
      5,
      'Botón Agregar Obligación',
      'El botón "Agregar Obligación" abre un formulario para crear una nueva tarea de cumplimiento vinculada a esta cláusula.'
    );

    // ============================================
    // PASO 6: Abrir formulario de obligación
    // ============================================
    await btnAgregarObligacion.click();
    await page.waitForTimeout(500);
    
    // Buscar modal o formulario
    const modal = page.locator('[role="dialog"], .modal, [class*="modal"], form').first();
    await page.waitForTimeout(300);
    await docHelper.documentStep(
      6,
      'Formulario de Nueva Obligación',
      'El formulario permite definir la obligación con todos sus detalles: descripción, fecha de vencimiento, área responsable y usuarios asignados.'
    );

    // ============================================
    // PASO 7: Campos del formulario
    // ============================================
    // La descripción es un editor de texto enriquecido (Tiptap), no un textarea:
    // se escribe sobre el área contenteditable.
    const campoDescripcion = page.locator('[contenteditable="true"]').first();
    if (await campoDescripcion.isVisible()) {
      await campoDescripcion.click();
      await campoDescripcion.pressSequentially(
        'Obligación de prueba documentación - Verificar cumplimiento según cláusula'
      );
      await docHelper.documentStep(
        7,
        'Descripción de la Obligación',
        'El campo de descripción detalla qué debe cumplirse. Admite formato enriquecido —negrita, cursiva y listas— para ordenar obligaciones con varios puntos.'
      );
    }

    // ============================================
    // PASO 7b: Aplicar formato enriquecido
    // ============================================
    const botonVinetas = page.getByRole('button', { name: /viñeta/i }).first();
    if (await botonVinetas.isVisible()) {
      await campoDescripcion.press('Enter');
      await botonVinetas.click();
      await campoDescripcion.pressSequentially('Entregar informe mensual');
      await campoDescripcion.press('Enter');
      await campoDescripcion.pressSequentially('Notificar dentro de las 48 horas');

      // El formato tiene que existir de verdad en el documento, no ser sólo visual.
      await expect(campoDescripcion.locator('li')).toHaveCount(2);

      await docHelper.documentStep(
        7.1,
        'Formato Enriquecido en la Descripción',
        'La barra de herramientas permite estructurar la obligación en una lista. Cada punto queda como un ítem separado, más fácil de leer y de verificar al momento del control.'
      );
    }

    // ============================================
    // PASO 8: Fecha de vencimiento
    // ============================================
    const campoFecha = page.locator('input[type="date"]').first();
    if (await campoFecha.isVisible()) {
      // Establecer fecha 30 días en el futuro
      const fechaFutura = new Date();
      fechaFutura.setDate(fechaFutura.getDate() + 30);
      const fechaStr = fechaFutura.toISOString().split('T')[0];
      await campoFecha.fill(fechaStr);
      await docHelper.documentStep(
        8,
        'Fecha de Vencimiento',
        'La fecha de vencimiento determina cuándo debe completarse la obligación. El sistema generará alertas automáticas conforme se acerque la fecha.'
      );
    }

    // ============================================
    // PASO 9: Asignar área responsable
    // ============================================
    const selectArea = page.locator('select').filter({ hasText: /área|area/i }).first();
    if (await selectArea.isVisible()) {
      await selectArea.click();
      await page.waitForTimeout(300);
      await docHelper.documentStep(
        9,
        'Área Responsable',
        'Seleccionamos el área organizacional responsable del cumplimiento. Las áreas agrupan usuarios y facilitan la distribución de responsabilidades.'
      );
      
      // Seleccionar primera área disponible
      const options = await selectArea.locator('option').all();
      if (options.length > 1) {
        await selectArea.selectOption({ index: 1 });
      }
    }

    // ============================================
    // PASO 10: Asignar responsables
    // ============================================
    const selectResponsable = page.locator('select').filter({ hasText: /responsable|usuario/i }).first();
    if (await selectResponsable.isVisible()) {
      await docHelper.documentStep(
        10,
        'Usuarios Responsables',
        'Se pueden asignar uno o más usuarios como responsables directos. Recibirán notificaciones sobre el estado y vencimiento de la obligación.'
      );
    }

    // ============================================
    // PASO 11: Guardar la obligación
    // ============================================
    const btnGuardar = page.locator('button:has-text("Guardar"), button:has-text("Crear"), button[type="submit"]').first();
    if (await btnGuardar.isVisible()) {
      await docHelper.documentStep(
        11,
        'Guardar Obligación',
        'Al guardar, la obligación queda vinculada a la cláusula y aparece en la lista de obligaciones del documento y en la vista de tareas del sistema.'
      );
      
      // Si es un test real, podemos hacer click
      // await btnGuardar.click();
      // await page.waitForTimeout(1000);
    }

    // Cerrar el modal si está abierto - usar selector específico del modal de obligación
    // El modal tiene un heading "Nueva(s) Obligación(es)" y botón "Cancelar"
    const modalCancelar = page.locator('h3:has-text("Nueva") ~ button:has-text("Cancelar"), button:has-text("Cancelar"):near(h3:has-text("Nueva"))').first();
    
    // Alternativa: buscar el botón Cancelar que NO sea en el sidebar
    const btnCancelarModal = page.locator('button:has-text("Cancelar")').first();
    
    if (await btnCancelarModal.isVisible({ timeout: 2000 }).catch(() => false)) {
      await btnCancelarModal.click({ timeout: 5000 });
      await page.waitForTimeout(300);
    } else {
      // Si no hay botón, presionar Escape para cerrar el modal
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }

    // ============================================
    // PASO 12: Ver obligaciones en lista de tareas
    // ============================================
    await page.click('text=Obligaciones');
    await page.waitForTimeout(1000);
    await docHelper.documentStep(
      12,
      'Vista de Obligaciones',
      'Las obligaciones creadas aparecen en la sección "Obligaciones" del menú. Aquí se gestionan todas las tareas de cumplimiento con su estado y progreso.'
    );

    // Generar el README final
    await docHelper.generateReadme();
  });
});
