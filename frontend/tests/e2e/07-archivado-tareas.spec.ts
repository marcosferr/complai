/**
 * Test E2E para documentación técnica: Archivado de Tareas
 * 
 * Este test documenta el flujo de archivar tareas/obligaciones
 * completadas o que ya no requieren seguimiento activo.
 */

import { test, expect } from './fixtures/auth.fixture';
import { DocumentationHelper, OUTPUT_DIRS } from './utils/screenshot-helper';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('07 - Archivado de Tareas', () => {
  
  test('Documentar flujo de archivar obligaciones', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    const docHelper = new DocumentationHelper(
      page,
      'Archivado de Tareas',
      OUTPUT_DIRS.ARCHIVADO_TAREAS
    );

    // ============================================
    // PASO 1: Navegar a Obligaciones
    // ============================================
    await page.click('text=Obligaciones');
    await page.waitForTimeout(1000);
    await docHelper.documentStep(
      1,
      'Lista de Obligaciones',
      'Accedemos a la sección de Obligaciones. Las tareas completadas o que no requieren seguimiento activo pueden archivarse para mantener organizada la vista principal.'
    );

    // ============================================
    // PASO 2: Ver filtros disponibles
    // ============================================
    const filtros = page.locator('select, [class*="filter"], button:has-text("Filtrar")').first();
    if (await filtros.isVisible()) {
      await docHelper.documentStep(
        2,
        'Filtros de Obligaciones',
        'Los filtros permiten ver obligaciones por estado (Pendiente, En Progreso, Completada), área, fecha de vencimiento, y también acceder a las obligaciones archivadas.'
      );
    }

    // ============================================
    // PASO 3: Seleccionar una tarea completada
    // ============================================
    // Buscar una tarea con estado completado o cualquier tarea disponible
    const tareaCompletada = page.locator('text=/COMPLETADO|completada/i').first();
    let tareaSeleccionada;
    
    if (await tareaCompletada.isVisible()) {
      tareaSeleccionada = tareaCompletada.locator('xpath=ancestor::*[contains(@class,"card") or contains(@class,"row")]').first();
    } else {
      tareaSeleccionada = page.locator('[class*="card"], [class*="task-item"], tr').filter({ hasText: /Obligacion/i }).first();
    }
    
    if (await tareaSeleccionada.isVisible()) {
      await tareaSeleccionada.click();
      await page.waitForTimeout(1000);
      await docHelper.documentStep(
        3,
        'Obligación Seleccionada',
        'Seleccionamos una obligación para archivar. Generalmente se archivan tareas completadas, vencidas, o que ya no aplican.'
      );
    }

    // ============================================
    // PASO 4: Ver opciones de la tarea
    // ============================================
    const menuOpciones = page.locator('button:has-text("more"), [class*="menu"], [class*="dropdown"]').first();
    if (await menuOpciones.isVisible()) {
      await menuOpciones.click();
      await page.waitForTimeout(300);
      await docHelper.documentStep(
        4,
        'Menú de Opciones',
        'El menú de opciones de cada tarea incluye acciones como editar, cambiar estado, y archivar. El archivado mueve la tarea a una sección separada.'
      );
    }

    // ============================================
    // PASO 5: Buscar opción de archivar
    // ============================================
    const btnArchivar = page.locator('button:has-text("Archivar"), [class*="archive"]').first();
    const archiveVisible = await btnArchivar.isVisible({ timeout: 3000 }).catch(() => false);
    if (archiveVisible) {
      await docHelper.documentStep(
        5,
        'Opción Archivar',
        'La opción "Archivar" permite mover la obligación a un estado archivado. Las tareas archivadas no aparecen en la lista principal pero pueden consultarse cuando sea necesario.'
      );
    }

    // ============================================
    // PASO 6: Confirmar archivado
    // ============================================
    if (archiveVisible) {
      await btnArchivar.click();
      await page.waitForTimeout(500);
      
      // Buscar modal de confirmación
      const modalConfirm = page.locator('[role="dialog"], .modal').first();
      if (await modalConfirm.isVisible({ timeout: 3000 }).catch(() => false)) {
        await docHelper.documentStep(
          6,
          'Confirmación de Archivado',
          'El sistema solicita confirmación antes de archivar. Esto previene archivados accidentales de tareas activas.'
        );
        
        // Cancelar para no archivar realmente
        const btnCancelar = modalConfirm.locator('button:has-text("Cancelar")').first();
        if (await btnCancelar.isVisible({ timeout: 2000 }).catch(() => false)) {
          await btnCancelar.click();
        }
      }
    }

    // ============================================
    // PASO 7: Ver tareas archivadas
    // ============================================
    const filtroArchivadas = page.locator('button:has-text("Archivadas"), select option:has-text("Archivadas"), [class*="tab"]:has-text("Archivadas")').first();
    if (await filtroArchivadas.isVisible()) {
      await filtroArchivadas.click();
      await page.waitForTimeout(500);
      await docHelper.documentStep(
        7,
        'Ver Tareas Archivadas',
        'El filtro "Archivadas" permite acceder a todas las obligaciones que han sido archivadas. Esto es útil para consultas históricas y auditorías.'
      );
    }

    // ============================================
    // PASO 8: Restaurar tarea archivada
    // ============================================
    const btnRestaurar = page.locator('button:has-text("Restaurar"), button:has-text("Desarchivar")').first();
    if (await btnRestaurar.isVisible()) {
      await docHelper.documentStep(
        8,
        'Restaurar Tarea Archivada',
        'Las tareas archivadas pueden restaurarse si es necesario. La opción "Restaurar" devuelve la tarea a la lista principal con su estado anterior.'
      );
    }

    // ============================================
    // PASO 9: Vista de auditoría
    // ============================================
    await page.click('text=Compliance');
    await page.waitForTimeout(1000);
    await docHelper.documentStep(
      9,
      'Vista de Compliance',
      'En la sección de Compliance/Auditorías se puede ver el historial completo incluyendo tareas archivadas. Esto asegura trazabilidad completa del cumplimiento.'
    );

    // ============================================
    // PASO 10: Beneficios del archivado
    // ============================================
    await page.goto('/');
    await page.waitForTimeout(500);
    await docHelper.documentStep(
      10,
      'Dashboard Actualizado',
      'Al archivar tareas completadas, el Dashboard y las métricas reflejan solo las obligaciones activas. Esto mejora la visibilidad del trabajo pendiente y facilita la priorización.'
    );

    // Generar el README final
    await docHelper.generateReadme();
  });
});
