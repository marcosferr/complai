import { Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

export interface ScreenshotOptions {
  stepNumber: number;
  stepName: string;
  outputDir: string;
}

/**
 * Captura una screenshot con nombre estandarizado
 */
export async function captureStep(
  page: Page,
  options: ScreenshotOptions
): Promise<string> {
  const fileName = `step-${options.stepNumber.toString().padStart(2, '0')}-${slugify(options.stepName)}.png`;
  const filePath = path.join(options.outputDir, 'screenshots', fileName);
  
  // Asegurar que el directorio existe
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  await page.screenshot({ 
    path: filePath, 
    fullPage: false,
    animations: 'disabled'
  });
  
  console.log(`📸 Screenshot guardada: ${fileName}`);
  return fileName;
}

/**
 * Genera un slug a partir de texto
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[áàäâ]/g, 'a')
    .replace(/[éèëê]/g, 'e')
    .replace(/[íìïî]/g, 'i')
    .replace(/[óòöô]/g, 'o')
    .replace(/[úùüû]/g, 'u')
    .replace(/ñ/g, 'n')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Clase helper para documentación de una funcionalidad
 */
export class DocumentationHelper {
  private steps: Array<{
    number: number;
    title: string;
    description: string;
    screenshot: string;
  }> = [];
  
  private outputDir: string;
  private featureName: string;
  private page: Page;
  
  constructor(page: Page, featureName: string, outputDir: string) {
    this.page = page;
    this.featureName = featureName;
    this.outputDir = outputDir;
  }
  
  /**
   * Documenta un paso con screenshot
   */
  async documentStep(
    stepNumber: number,
    title: string,
    description: string
  ): Promise<void> {
    // Esperar un momento para que la UI se estabilice
    await this.page.waitForTimeout(500);
    
    const screenshot = await captureStep(this.page, {
      stepNumber,
      stepName: title,
      outputDir: this.outputDir,
    });
    
    this.steps.push({
      number: stepNumber,
      title,
      description,
      screenshot,
    });
  }
  
  /**
   * Genera el README.md con todos los pasos documentados
   */
  async generateReadme(
    featureDescription?: string,
    technicalNotes?: string[]
  ): Promise<string> {
    const description = featureDescription || `Documentación paso a paso de la funcionalidad "${this.featureName}" en el sistema Compliance Tracker.`;
    const notes = technicalNotes || [
      'Usuario de prueba: admin@compliance.com',
      'Este documento fue generado automáticamente mediante tests E2E con Playwright',
    ];
    
    const stepsMarkdown = this.steps
      .sort((a, b) => a.number - b.number)
      .map(
        (step) => `### Paso ${step.number}: ${step.title}

${step.description}

![${step.title}](./screenshots/${step.screenshot})
`
      )
      .join('\n');
    
    const notesMarkdown = notes.map((note) => `- ${note}`).join('\n');
    
    const content = `# ${this.featureName}

## Descripción
${description}

## Video Demostrativo
[Ver video de demostración](./videos/demo.webm)

## Pasos

${stepsMarkdown}

## Notas Técnicas
${notesMarkdown}
`;

    // Guardar automáticamente
    this.saveReadme(content);
    return content;
  }
  
  /**
   * Guarda el README.md en el directorio de salida
   */
  saveReadme(content: string): void {
    const readmePath = path.join(this.outputDir, 'README.md');
    fs.writeFileSync(readmePath, content, 'utf-8');
    console.log(`📄 README guardado: ${readmePath}`);
  }
}

/**
 * Rutas de salida para cada funcionalidad
 */
export const OUTPUT_DIRS = {
  SUBIDA_DOCUMENTOS: 'C:/Users/ferre/Documents/Workspace/Compliance-Tracker/docs/technical-docs/01-subida-documentos',
  DOCUMENTO_PADRE: 'C:/Users/ferre/Documents/Workspace/Compliance-Tracker/docs/technical-docs/02-documento-padre',
  DOCUMENTO_AUXILIAR: 'C:/Users/ferre/Documents/Workspace/Compliance-Tracker/docs/technical-docs/03-documento-auxiliar',
  REFERENCIA_CLAUSULAS: 'C:/Users/ferre/Documents/Workspace/Compliance-Tracker/docs/technical-docs/04-referencia-clausulas',
  CREACION_OBLIGACIONES: 'C:/Users/ferre/Documents/Workspace/Compliance-Tracker/docs/technical-docs/05-creacion-obligaciones',
  ARCHIVOS_TAREAS: 'C:/Users/ferre/Documents/Workspace/Compliance-Tracker/docs/technical-docs/06-archivos-tareas',
  ARCHIVADO_TAREAS: 'C:/Users/ferre/Documents/Workspace/Compliance-Tracker/docs/technical-docs/07-archivado-tareas',
  CREACION_USUARIOS: 'C:/Users/ferre/Documents/Workspace/Compliance-Tracker/docs/technical-docs/08-creacion-usuarios',
};
