/**
 * Test E2E para documentación técnica: Creación de Usuarios
 * 
 * Este test documenta el flujo completo de crear nuevos usuarios
 * en el sistema, asignando roles y áreas.
 */

import { test, expect } from './fixtures/auth.fixture';
import { DocumentationHelper, OUTPUT_DIRS } from './utils/screenshot-helper';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('08 - Creación de Usuarios', () => {
  
  test('Documentar flujo de crear nuevo usuario', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    const docHelper = new DocumentationHelper(
      page,
      'Creación de Usuarios',
      OUTPUT_DIRS.CREACION_USUARIOS
    );

    // ============================================
    // PASO 1: Navegar a Gestión de Usuarios
    // ============================================
    await page.click('text=Gestión de Usuarios');
    await page.waitForSelector('text=/Usuarios|Users/i', { timeout: 10000 });
    await docHelper.documentStep(
      1,
      'Gestión de Usuarios',
      'Accedemos a la sección de Gestión de Usuarios. Aquí los administradores pueden crear, editar y gestionar los usuarios del sistema.'
    );

    // ============================================
    // PASO 2: Ver lista de usuarios existentes
    // ============================================
    await page.waitForTimeout(500);
    await docHelper.documentStep(
      2,
      'Lista de Usuarios',
      'La lista muestra todos los usuarios registrados con su nombre, email, rol asignado, área y estado (activo/inactivo).'
    );

    // ============================================
    // PASO 3: Botón crear nuevo usuario
    // ============================================
    const btnNuevo = page.locator('button:has-text("Nuevo"), button:has-text("Crear"), button:has-text("add"), button:has-text("Agregar")').first();
    if (await btnNuevo.isVisible()) {
      await docHelper.documentStep(
        3,
        'Botón Nuevo Usuario',
        'El botón "Nuevo Usuario" o "Crear" abre el formulario para registrar un nuevo usuario en el sistema.'
      );
      
      await btnNuevo.click();
      await page.waitForTimeout(500);
    }

    // ============================================
    // PASO 4: Formulario de creación
    // ============================================
    const formulario = page.locator('form, [role="dialog"], .modal').first();
    if (await formulario.isVisible()) {
      await docHelper.documentStep(
        4,
        'Formulario de Usuario',
        'El formulario requiere información básica del usuario: nombre completo, email, contraseña, rol y área asignada.'
      );
    }

    // ============================================
    // PASO 5: Campo nombre
    // ============================================
    const campoNombre = page.locator('input[name*="nombre"], input[placeholder*="nombre"], input#nombre, input#name').first();
    if (await campoNombre.isVisible()) {
      await campoNombre.fill('Usuario Prueba Documentación');
      await docHelper.documentStep(
        5,
        'Nombre del Usuario',
        'El nombre completo del usuario. Se utiliza para identificación en el sistema y en las asignaciones de tareas.'
      );
    }

    // ============================================
    // PASO 6: Campo email
    // ============================================
    const campoEmail = page.locator('input[type="email"], input[name*="email"]').first();
    if (await campoEmail.isVisible()) {
      await campoEmail.fill('usuario.prueba.doc@compliance.com');
      await docHelper.documentStep(
        6,
        'Email del Usuario',
        'El email sirve como identificador único y para las notificaciones del sistema. Debe ser una dirección válida dentro de la organización.'
      );
    }

    // ============================================
    // PASO 7: Campo contraseña
    // ============================================
    const campoPassword = page.locator('input[type="password"]').first();
    if (await campoPassword.isVisible()) {
      await campoPassword.fill('ContraseñaSegura123!');
      await docHelper.documentStep(
        7,
        'Contraseña',
        'La contraseña inicial del usuario. Se recomienda usar contraseñas seguras con combinación de mayúsculas, minúsculas, números y símbolos.'
      );
    }

    // ============================================
    // PASO 8: Selección de rol
    // ============================================
    const selectRol = page.locator('select').filter({ hasText: /rol|role/i }).first();
    if (!await selectRol.isVisible()) {
      // Buscar por otras formas
      const selectRolAlt = page.locator('select[name*="rol"], select#rol, [class*="role"]').first();
      if (await selectRolAlt.isVisible()) {
        await selectRolAlt.click();
      }
    }
    await page.waitForTimeout(300);
    await docHelper.documentStep(
      8,
      'Selección de Rol',
      'Los roles determinan los permisos del usuario: ADMIN (acceso total), DIRECTOR (gestiona su área), RESPONSABLE (gestiona tareas asignadas), ANALISTA (consulta y reportes).'
    );

    // ============================================
    // PASO 9: Selección de área
    // ============================================
    const selectArea = page.locator('select').filter({ hasText: /área|area/i }).first();
    if (await selectArea.isVisible()) {
      await selectArea.click();
      await page.waitForTimeout(300);
      await docHelper.documentStep(
        9,
        'Asignación de Área',
        'El área organizacional a la que pertenece el usuario. Determina qué documentos y tareas puede ver y gestionar según su rol.'
      );
    }

    // ============================================
    // PASO 10: Opciones adicionales
    // ============================================
    const checkActivo = page.locator('input[type="checkbox"]').first();
    if (await checkActivo.isVisible()) {
      await docHelper.documentStep(
        10,
        'Estado del Usuario',
        'El checkbox de "Activo" determina si el usuario puede acceder al sistema. Los usuarios inactivos no pueden iniciar sesión pero se mantiene su historial.'
      );
    }

    // ============================================
    // PASO 11: Guardar usuario
    // ============================================
    const btnGuardar = page.locator('button:has-text("Guardar"), button:has-text("Crear"), button[type="submit"]').first();
    if (await btnGuardar.isVisible()) {
      await docHelper.documentStep(
        11,
        'Guardar Usuario',
        'Al guardar, el usuario queda registrado en el sistema. Se envía un email de bienvenida con las credenciales de acceso (si está configurado).'
      );
    }

    // Cancelar para no crear usuario realmente - cerrar modal con múltiples intentos
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    
    // Verificar si el modal se cerró, si no, intentar con click fuera
    const modalOverlay = page.locator('.fixed.inset-0.bg-black');
    if (await modalOverlay.isVisible({ timeout: 1000 }).catch(() => false)) {
      // Intentar hacer click en el overlay para cerrar
      await page.mouse.click(10, 10);
      await page.waitForTimeout(500);
    }

    // ============================================
    // PASO 12: Vista final de gestión de usuarios
    // ============================================
    await page.goto('/usuarios');
    await page.waitForTimeout(1000);
    await docHelper.documentStep(
      12,
      'Gestión Completa de Usuarios',
      'Resumen de roles del sistema: ADMIN (configuración completa), DIRECTOR (supervisa área), RESPONSABLE (ejecuta tareas asignadas). Cada rol determina los permisos y vistas disponibles.'
    );

    // Generar el README final
    await docHelper.generateReadme();
  });
});
