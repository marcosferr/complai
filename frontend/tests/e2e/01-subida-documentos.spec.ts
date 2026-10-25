/**
 * Test E2E para documentación técnica: Subida de Documentos
 * 
 * Este test documenta el flujo completo de subida de un documento legal
 * al sistema Compliance Tracker, capturando screenshots en cada paso.
 */

import { test, expect } from './fixtures/auth.fixture';
import { DocumentationHelper, OUTPUT_DIRS } from './utils/screenshot-helper';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

// Obtener __dirname en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Crear un archivo PDF de prueba simple
function createTestPDF(filePath: string): void {
  // PDF mínimo válido
  const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << >> >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT
/F1 12 Tf
100 700 Td
(Documento de Prueba - Compliance Tracker) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000214 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
306
%%EOF`;

  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, pdfContent);
}

test.describe('01 - Subida de Documentos', () => {
  
  test('Documentar flujo completo de subida de documento', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    const docHelper = new DocumentationHelper(
      page,
      'Subida de Documentos',
      OUTPUT_DIRS.SUBIDA_DOCUMENTOS
    );

    // Crear PDF de prueba
    const testFilePath = path.join(__dirname, 'test-files', 'documento-prueba.pdf');
    createTestPDF(testFilePath);

    // ============================================
    // PASO 1: Dashboard después del login
    // ============================================
    await page.waitForSelector('h1', { timeout: 10000 });
    await docHelper.documentStep(
      1,
      'Dashboard Principal',
      'Después de iniciar sesión, el usuario ve el dashboard con el resumen de actividades y métricas del sistema.'
    );

    // ============================================
    // PASO 2: Navegar a sección de documentos
    // ============================================
    await page.click('a[href="/documentos"]');
    await page.waitForURL('**/documentos', { timeout: 10000 });
    await page.waitForSelector('h2:has-text("Contratos")', { timeout: 10000 });
    await page.waitForTimeout(500); // Esperar que cargue la lista
    
    await docHelper.documentStep(
      2,
      'Lista de Documentos',
      'La sección de documentos muestra todos los documentos legales registrados. Incluye una barra de búsqueda y el botón "Upload Document" para agregar nuevos.'
    );

    // ============================================
    // PASO 3: Abrir modal de subida
    // ============================================
    await page.click('button:has-text("Upload Document")');
    await page.waitForSelector('h2:has-text("Upload Legal Document")', { timeout: 5000 });
    await page.waitForTimeout(300);
    
    await docHelper.documentStep(
      3,
      'Modal de Subida',
      'Al hacer clic en "Upload Document", se abre un modal con el formulario para subir un nuevo documento legal.'
    );

    // ============================================
    // PASO 4: Subir archivo PDF
    // ============================================
    // Usar setInputFiles para subir el archivo
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFilePath);
    await page.waitForTimeout(500);
    
    await docHelper.documentStep(
      4,
      'Archivo Seleccionado',
      'El usuario puede arrastrar un archivo o hacer clic en "Browse Files" para seleccionar un documento. Los formatos soportados son: PDF, DOC, DOCX, TXT.'
    );

    // ============================================
    // PASO 5: Completar formulario
    // ============================================
    // Título del documento
    await page.fill('input#titulo', 'Contrato de Prueba E2E');
    
    // Tipo de documento
    await page.selectOption('select#tipo', 'CONTRATO');
    
    // Fecha de vencimiento (opcional)
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const dateStr = futureDate.toISOString().split('T')[0];
    await page.fill('input#fecha_vencimiento', dateStr);
    
    // Etiquetas/Objetos regulados (opcional)
    await page.fill('input#etiquetas', 'Prueba, E2E, Documentación');
    
    await page.waitForTimeout(300);
    
    await docHelper.documentStep(
      5,
      'Formulario Completado',
      'El formulario incluye: Título (obligatorio), Tipo de documento (obligatorio), Fecha de vencimiento (opcional) y Objetos regulados (opcional, separados por comas).'
    );

    // ============================================
    // PASO 6: Guardar documento
    // ============================================
    await page.click('button[type="submit"]:has-text("Upload Document")');
    
    // Esperar que el modal se cierre y aparezca notificación de éxito
    await page.waitForSelector('h2:has-text("Upload Legal Document")', { 
      state: 'hidden', 
      timeout: 30000 
    });
    
    // Esperar un momento para que se procese
    await page.waitForTimeout(2000);
    
    await docHelper.documentStep(
      6,
      'Documento Guardado',
      'Al hacer clic en "Upload Document", el sistema sube el archivo, crea el registro y muestra una notificación de éxito. El documento se procesa con IA para extraer cláusulas automáticamente.'
    );

    // ============================================
    // PASO 7: Verificar en la lista
    // ============================================
    // Buscar el documento recién creado
    await page.fill('input[placeholder="Search documents..."]', 'Contrato de Prueba E2E');
    await page.waitForTimeout(1000);
    
    // Verificar que aparece
    await expect(page.locator('h4:has-text("Contrato de Prueba E2E")')).toBeVisible({ timeout: 10000 });
    
    await docHelper.documentStep(
      7,
      'Documento en Lista',
      'El documento aparece inmediatamente en la lista. Se puede buscar por título usando la barra de búsqueda. El estado inicial es "BORRADOR" hasta que se active.'
    );

    // ============================================
    // Generar README
    // ============================================
    const readme = docHelper.generateReadme(
      `La funcionalidad de **Subida de Documentos** permite a los usuarios cargar documentos legales al sistema Compliance Tracker. 

Los documentos subidos son procesados automáticamente por IA (OpenAI GPT-4o-mini) para extraer:
- Cláusulas y sus descripciones
- Obligaciones identificadas
- Fechas relevantes
- Partes involucradas

Esta extracción automática facilita la gestión del compliance al convertir documentos PDF en información estructurada y accionable.`,
      [
        '**Endpoint API**: `POST /api/documentos/upload/` - Multipart form data',
        '**Modelo**: `apps.documentos.models.DocumentoLegal`',
        '**Permisos**: Requiere autenticación. Roles ADMIN y DIRECTOR pueden crear documentos.',
        '**Procesamiento IA**: Tarea Celery `process_document_with_ai` ejecutada en background',
        '**Estados de procesamiento**: PENDIENTE → PROCESANDO → COMPLETADO/ERROR',
        '**Formatos soportados**: PDF, DOC, DOCX, TXT',
        '**Campos requeridos**: `titulo`, `tipo`, `archivo`',
        '**Campos opcionales**: `fecha_vencimiento`, `etiquetas` (objetos regulados)',
      ]
    );
    
    docHelper.saveReadme(readme);

    // Limpiar archivo de prueba
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  });
});
