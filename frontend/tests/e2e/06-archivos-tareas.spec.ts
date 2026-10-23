/**
 * Test E2E para documentación técnica: Subida de Archivos a Tareas
 * 
 * Este test documenta el flujo de adjuntar archivos de evidencia
 * a las tareas/obligaciones de cumplimiento.
 */

import { test, expect } from './fixtures/auth.fixture';
import { DocumentationHelper, OUTPUT_DIRS } from './utils/screenshot-helper';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Crear archivo de prueba
function createTestFile(filePath: string, content: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, content);
}

test.describe('06 - Archivos en Tareas', () => {
  
  test('Documentar flujo de subir archivos a obligaciones', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    const docHelper = new DocumentationHelper(
      page,
      'Subida de Archivos a Tareas',
      OUTPUT_DIRS.ARCHIVOS_TAREAS
    );

    // Crear archivo de prueba
    const testFilePath = path.join(__dirname, 'test-files', 'evidencia-prueba.txt');
    createTestFile(testFilePath, 'Archivo de evidencia de prueba para documentación E2E - Compliance Tracker');

    // ============================================
    // PASO 1: Navegar a Obligaciones
    // ============================================
    await page.click('text=Obligaciones');
    await page.waitForSelector('text=/Obligaciones|Tareas/i', { timeout: 10000 });
    await docHelper.documentStep(
      1,
      'Lista de Obligaciones',
      'Accedemos a la sección de Obligaciones donde se gestionan todas las tareas de cumplimiento. Los archivos de evidencia se adjuntan a cada tarea específica.'
    );

    // ============================================
    // PASO 2: Seleccionar una tarea
    // ============================================
    // Buscar una tarjeta de tarea y hacer click
    const tareaCard = page.locator('[class*="card"], [class*="task"], tr').filter({ hasText: /Obligacion|Tarea/i }).first();
    if (await tareaCard.isVisible()) {
      await tareaCard.click();
      await page.waitForTimeout(1000);
      await docHelper.documentStep(
        2,
        'Tarea Seleccionada',
        'Seleccionamos una obligación de la lista. Al hacer clic se abre el panel de detalles donde podemos gestionar los archivos adjuntos.'
      );
    }

    // ============================================
    // PASO 3: Ver detalles de la tarea
    // ============================================
    // Esperar a que cargue el panel de detalles
    await page.waitForTimeout(500);
    await docHelper.documentStep(
      3,
      'Detalle de la Obligación',
      'El panel de detalles muestra la información de la obligación: descripción, fecha de vencimiento, estado, área responsable, y la sección de archivos adjuntos.'
    );

    // ============================================
    // PASO 4: Localizar sección de archivos
    // ============================================
    const seccionArchivos = page.locator('text=/Archivos|Adjuntos|Evidencia|attachment/i').first();
    if (await seccionArchivos.isVisible()) {
      await seccionArchivos.scrollIntoViewIfNeeded();
      await docHelper.documentStep(
        4,
        'Sección de Archivos',
        'La sección de archivos muestra los documentos adjuntos existentes y permite subir nuevos archivos como evidencia del cumplimiento.'
      );
    }

    // ============================================
    // PASO 5: Botón de subir archivo
    // ============================================
    const btnSubir = page.locator('button:has-text("Subir"), button:has-text("Adjuntar"), input[type="file"]').first();
    if (await btnSubir.isVisible()) {
      await docHelper.documentStep(
        5,
        'Botón Subir Archivo',
        'El botón "Subir" o "Adjuntar" permite seleccionar archivos del sistema para adjuntar a la obligación. Se aceptan múltiples formatos: PDF, imágenes, documentos Office, etc.'
      );
    }

    // ============================================
    // PASO 6: Seleccionar archivo
    // ============================================
    const fileInput = page.locator('input[type="file"]').first();
    if (await fileInput.count() > 0) {
      // Subir el archivo de prueba
      await fileInput.setInputFiles(testFilePath);
      await page.waitForTimeout(1000);
      await docHelper.documentStep(
        6,
        'Archivo Seleccionado',
        'Al seleccionar un archivo, se prepara para la subida. Algunos sistemas muestran una vista previa o confirmación antes de adjuntar definitivamente.'
      );
    }

    // ============================================
    // PASO 7: Ver archivos adjuntos
    // ============================================
    const listaArchivos = page.locator('[class*="file-list"], [class*="attachment"]').first();
    if (await listaArchivos.isVisible()) {
      await docHelper.documentStep(
        7,
        'Lista de Archivos Adjuntos',
        'Los archivos adjuntos aparecen en una lista con nombre, tamaño, fecha de subida y opciones para descargar o eliminar. Sirven como evidencia del cumplimiento de la obligación.'
      );
    }

    // ============================================
    // PASO 8: Descargar archivo
    // ============================================
    const btnDescargar = page.locator('button:has-text("download"), [title*="Descargar"], [aria-label*="download"]').first();
    if (await btnDescargar.isVisible()) {
      await docHelper.documentStep(
        8,
        'Descargar Archivo',
        'Cada archivo puede descargarse haciendo clic en el botón de descarga. Esto permite a los auditores verificar la evidencia de cumplimiento.'
      );
    }

    // ============================================
    // PASO 9: Eliminar archivo
    // ============================================
    const btnEliminar = page.locator('button:has-text("delete"), [title*="Eliminar"], [aria-label*="delete"]').first();
    if (await btnEliminar.isVisible()) {
      await docHelper.documentStep(
        9,
        'Eliminar Archivo',
        'El botón de eliminar permite quitar archivos adjuntos. Esta acción generalmente requiere confirmación para evitar eliminaciones accidentales.'
      );
    }

    // ============================================
    // PASO 10: Ver en checklist
    // ============================================
    const checklistSection = page.locator('text=/Checklist|Items|Tareas pendientes/i').first();
    if (await checklistSection.isVisible()) {
      await checklistSection.scrollIntoViewIfNeeded();
      await docHelper.documentStep(
        10,
        'Checklist de la Obligación',
        'Algunas obligaciones tienen un checklist de items a completar. Los archivos adjuntos pueden servir como evidencia para marcar items como completados.'
      );
    }

    // ============================================
    // PASO 11: Estado de la tarea
    // ============================================
    const estadoTarea = page.locator('[class*="status"], [class*="estado"], text=PENDIENTE, text=EN_PROGRESO, text=COMPLETADO').first();
    if (await estadoTarea.isVisible({ timeout: 3000 }).catch(() => false)) {
      await docHelper.documentStep(
        11,
        'Estado de la Obligación',
        'El estado de la obligación refleja su progreso. Al adjuntar evidencia y completar el checklist, la tarea avanza por las etapas definidas en el flujo de cumplimiento.'
      );
    }

    // Generar el README final
    await docHelper.generateReadme();
  });
});
