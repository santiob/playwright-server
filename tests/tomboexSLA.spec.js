import { test, expect } from '@playwright/test';

// Helper: esperar que el iframe esté listo y el campo sea interactuable
async function esperarIframeYCampo(page, selector, timeout = 30000) {
  console.log(`⏳ Esperando iframe + campo: ${selector}`);
  
  // 1. Esperar que el iframe exista en el DOM
  await page.waitForSelector('iframe[title="juego"]', { timeout });
  console.log('  ✓ iframe presente en DOM');
  
  // 2. Esperar que el iframe esté visible
  await page.locator('iframe[title="juego"]').waitFor({ state: 'visible', timeout });
  console.log('  ✓ iframe visible');

  // 3. Esperar que la red esté idle (iframe terminó de cargar)
  await page.waitForLoadState('networkidle', { timeout });
  console.log('  ✓ networkidle alcanzado');

  // 4. Esperar el campo dentro del iframe
  const iframe = page.frameLocator('iframe[title="juego"]');
  await iframe.locator(selector).waitFor({ state: 'visible', timeout });
  console.log(`  ✓ campo ${selector} visible`);

  return iframe;
}

async function openAndWaitModal(page, trigger, modalSelector) {
  await trigger.click();
  
  const modal = page.locator(modalSelector);
  await modal.waitFor({ state: 'visible', timeout: 5000 });
  await page.waitForTimeout(2000);
  
  return { modal };
}

async function cerrarModalTutorial(page) {
  console.log('🔍 Cerrando modal tutorial...');
  
  await page.waitForTimeout(1500);
  
  const iframe = page.frameLocator('iframe[title="juego"]');
  const modal = iframe.locator('[class*="ModalTour_modal"]').first();
  
  if (!await modal.isVisible().catch(() => false)) {
    console.log('✅ No hay modal');
    return true;
  }
  
  console.log('⚠️ Modal detectado, cerrando...');
  
  const btnClose = iframe.locator('[class*="ModalTour_closeBtn"]').first();
  
  if (await btnClose.isVisible().catch(() => false)) {
    await btnClose.click();
    console.log('  ✓ Click en X');
    await page.waitForTimeout(1000);
    
    const cerrado = !await modal.isVisible().catch(() => false);
    if (cerrado) {
      console.log('✅ Modal cerrado exitosamente');
      return true;
    }
  }
  
  await page.keyboard.press('Escape');
  console.log('  ✓ Escape presionado');
  await page.waitForTimeout(500);
  
  console.log('✅ Proceso completado');
  return true;
}

async function cerrarTooltipIframe(page, maxPasos = 10) {
  console.log('🔍 Cerrando tooltip...');
  
  const iframe = page.frameLocator('iframe[title="juego"]');
  await page.waitForTimeout(1500);
  
  for (let i = 0; i < maxPasos; i++) {
    const floater = iframe.locator('div.__floater.__floater__open');
    
    if (!await floater.isVisible().catch(() => false)) {
      if (i > 0) console.log(`✅ Cerrado en ${i} pasos`);
      else console.log('✅ No hay tooltip');
      return true;
    }
    
    console.log(`⚠️ Paso ${i + 1}`);
    
    const botonX = iframe.locator('button.step_closeStep__fJaF_');
    if (await botonX.isVisible().catch(() => false)) {
      await botonX.click();
      console.log('  ✓ X cerrado');
      await page.waitForTimeout(1500);
      continue;
    }
    
    const siguiente = iframe.locator('button:has-text("Siguiente")');
    if (await siguiente.isVisible().catch(() => false)) {
      await siguiente.click();
      console.log('  ✓ Siguiente');
      await page.waitForTimeout(1500);
      continue;
    }
    
    const cerrar = iframe.locator('button:has-text("Cerrar")');
    if (await cerrar.isVisible().catch(() => false)) {
      await cerrar.click();
      console.log('  ✓ Cerrar');
      await page.waitForTimeout(1500);
      continue;
    }
    
    break;
  }
  
  if (await iframe.locator('div.__floater.__floater__open').isVisible().catch(() => false)) {
    const content = await page.locator('iframe[title="juego"]').contentFrame();
    if (content) {
      await content.evaluate(() => {
        document.querySelectorAll('.__floater').forEach(el => el.remove());
      });
      await page.waitForTimeout(500);
      console.log('  ✓ Eliminado del DOM');
    }
  }
  
  console.log('✅ Completado');
  return true;
}

async function cerrarDialogoJconfirm(page) {
  console.log('🔍 Verificando diálogo jconfirm...');
  
  await page.waitForTimeout(1000);
  
  const iframe = page.frameLocator('iframe[title="juego"]');
  const dialogo = iframe.locator('.jconfirm.jconfirm-open').first();
  
  if (!await dialogo.isVisible().catch(() => false)) {
    console.log('✅ No hay diálogo jconfirm');
    return true;
  }
  
  console.log('⚠️ Diálogo jconfirm detectado, cerrando...');

  // Intentar todos los botones posibles dentro del diálogo
  const selectores = [
    '.jconfirm-buttons button',
    '.jconfirm button:has-text("Aceptar")',
    '.jconfirm button:has-text("OK")',
    '.jconfirm button:has-text("Cerrar")',
    '.jconfirm button:has-text("Cancelar")',
    '.jconfirm button.btn-primary',
    '.jconfirm button.btn-default',
    '.jconfirm button',
  ];

  for (const selector of selectores) {
    const btn = iframe.locator(selector).first();
    if (await btn.isVisible().catch(() => false)) {
      const texto = await btn.textContent().catch(() => '');
      console.log(`  → Intentando click en: "${texto.trim()}" (${selector})`);
      
      // Usar force:true para ignorar que algo lo tape
      await btn.click({ force: true });
      console.log('  ✓ Click ejecutado');
      await page.waitForTimeout(1500);
      
      if (!await dialogo.isVisible().catch(() => false)) {
        console.log('✅ Diálogo cerrado exitosamente');
        return true;
      }
      console.log('  ⚠️ Sigue abierto, probando siguiente...');
    }
  }

  // Último recurso: eliminar del DOM
  console.log('  → Eliminando jconfirm del DOM...');
  try {
    const frame = page.frames().find(f => f.name() === 'juego' || f.url().includes('juego'));
    if (frame) {
      await frame.evaluate(() => {
        document.querySelectorAll('.jconfirm').forEach(el => el.remove());
        document.querySelectorAll('.jconfirm-overlay').forEach(el => el.remove());
      });
      console.log('  ✓ Eliminado del DOM');
    }
  } catch(e) {
    console.log('  ⚠️ No se pudo eliminar del DOM:', e.message);
  }

  await page.waitForTimeout(500);
  console.log('✅ Proceso completado');
  return true;
}

//async function cerrarDialogoJconfirm(page) {
//  console.log('🔍 Verificando diálogo jconfirm...');
  
 // await page.waitForTimeout(1000);
  
//  const iframe = page.frameLocator('iframe[title="juego"]');
//  const dialogo = iframe.locator('.jconfirm.jconfirm-open').first();
  
//  if (!await dialogo.isVisible().catch(() => false)) {
//    console.log('✅ No hay diálogo jconfirm');
//    return true;
//  }
  
//  console.log('⚠️ Diálogo jconfirm detectado, cerrando...');
  
//  const btnAceptar = iframe.locator('.jconfirm button:has-text("Aceptar"), .jconfirm button:has-text("OK"), .jconfirm button.btn-primary').first();
  
//  if (await btnAceptar.isVisible().catch(() => false)) {
//    await btnAceptar.click();
//    console.log('  ✓ Click en Aceptar/OK');
//    await page.waitForTimeout(1000);
    
//    const cerrado = !await dialogo.isVisible().catch(() => false);
//    if (cerrado) {
//      console.log('✅ Diálogo cerrado exitosamente');
//      return true;
//    }
//  }
  
//  const btnClose = iframe.locator('.jconfirm .jconfirm-closeIcon').first();
//  if (await btnClose.isVisible().catch(() => false)) {
//    await btnClose.click();
//    console.log('  ✓ Click en X');
//    await page.waitForTimeout(1000);
//  }
  
//  await page.keyboard.press('Escape');
//  console.log('  ✓ Escape presionado');
//  await page.waitForTimeout(500);
  
//  console.log('✅ Proceso completado');
//  return true;
//}

test.describe('Test Tombola Salteña', () => {

  test.beforeEach(async ({ page }) => {
    const username = process.env.TEST_SLA_USER;
    const password = process.env.TEST_SLA_PASSWORD;

    if (!username || !password) {
      test.skip();
      console.log('⚠️ Test saltado: Credenciales no configuradas');
      return;
    }

    await page.goto('/plataforma/home');
    await page.waitForLoadState('networkidle');

    const btnAcceso = page.getByText(/^Acceso$/i).first();
    const { modal } = await openAndWaitModal(page, btnAcceso, '#loginModal');
    console.log('✅ Modal abierto');

    const inputUsuario = modal.locator('input[name="nroDocu"]:not(.nroDocuOlvide)');
    await inputUsuario.waitFor({ state: 'visible', timeout: 5000 });
    await inputUsuario.click();
    await page.waitForTimeout(300);
    await inputUsuario.fill(username);
    console.log('  ✓ Usuario ingresado');

    const inputPassword = modal.locator('input#clave:not(.nroDocuOlvide)').first();
    await inputPassword.waitFor({ state: 'visible', timeout: 5000 });
    await inputPassword.click();
    await page.waitForTimeout(300);
    await inputPassword.fill(password);
    console.log('  ✓ Contraseña ingresada');

    console.log('🖱️ Click en Ingresar...');
    await modal.locator('#botonLogin').click();

    await page.waitForTimeout(3000);

    const loginExitoso = await page.getByText(/¡Hola .+!/i).isVisible().catch(() => false);

    if (loginExitoso) {
      console.log('✅ LOGIN EXITOSO');
      expect(loginExitoso).toBeTruthy();
      await page.screenshot({ path: 'test-results/login-exitoso.png', fullPage: true });
    } else {
      throw new Error('❌ Login falló');
    }
  });

   test('Tombo Express', async ({ page }) => {
  await expect(page).toHaveURL(/.*\/plataforma\/home/);
  console.log('✅ Paso 1: En pantalla de juegos');
  await page.screenshot({ path: 'test-results/tomboexpress-01-home.png', fullPage: true });

  await cerrarModalTutorial(page);

  console.log('🖱️ Paso 2: Click en Tombo Express...');
  await page.getByRole('link', { name: 'img Tombo Express' }).click();
  console.log('✅ Click en Tombo Express ejecutado');

  // ⬇️ REEMPLAZA el waitForTimeout fijo por espera real del iframe+campo
  const iframe = await esperarIframeYCampo(page, '#fnroApuDir');
  await page.screenshot({ path: 'test-results/tomboexpress-02-pantalla.png', fullPage: true });

  await cerrarModalTutorial(page);

  for (let i = 1; i <= 2; i++) {
    console.log(`\n--- Apuesta ${i} ---`);

    const numeroDosCifras = String(Math.floor(Math.random() * 100)).padStart(2, '0');
    console.log('🎲 Número aleatorio generado:', numeroDosCifras);

    // Campo número — esperar visible antes de interactuar
    console.log('🔢 Completando campo número...');
    await iframe.locator('#fnroApuDir').waitFor({ state: 'visible', timeout: 15000 });
    await iframe.locator('#fnroApuDir').click();
    await iframe.locator('#fnroApuDir').fill(numeroDosCifras);
    console.log('✅ Campo número completado:', numeroDosCifras);

    console.log('🔢 Completando campo alcance...');
    await iframe.locator('input[name="fAlcApuDir"]').waitFor({ state: 'visible', timeout: 15000 });
    await iframe.locator('input[name="fAlcApuDir"]').click();
    await iframe.locator('input[name="fAlcApuDir"]').fill('10');
    console.log('✅ Campo alcance completado: 10');

    console.log('💰 Completando campo importe...');
    await iframe.locator('input[name="fImpoApuDir"]').waitFor({ state: 'visible', timeout: 15000 });
    await iframe.locator('input[name="fImpoApuDir"]').click();
    await iframe.locator('input[name="fImpoApuDir"]').fill('150');
    console.log('✅ Campo importe completado: 150');

    await page.waitForTimeout(1000);

    await page.screenshot({ path: `test-results/tomboexpress-03-apuesta-${i}.png`, fullPage: true });

    console.log('🖱️ Click en agregar jugada...');
    await iframe.locator('#btn-addJugada').waitFor({ state: 'visible', timeout: 15000 });
    await iframe.locator('#btn-addJugada').click();
    console.log('✅ Jugada agregada');

    await page.waitForTimeout(1000);
    await page.screenshot({ path: `test-results/tomboexpress-04-apuesta-${i}.png`, fullPage: true });


     // Esperar que el formulario se resetee completamente
    await page.waitForTimeout(1000);

    // Verificar que el campo esté limpio y listo
    await iframe.locator('#fnroApuDir').waitFor({ state: 'visible', timeout: 10000 });
    await expect(iframe.locator('#fnroApuDir')).toHaveValue('');
    console.log('  ✓ Campo número reseteado y listo');

  }

  console.log('🖱️ Click en JUGAR...');
  await iframe.getByRole('button', { name: 'JUGAR!' }).waitFor({ state: 'visible', timeout: 15000 });
  await iframe.getByRole('button', { name: 'JUGAR!' }).click();
  console.log('✅ Click en JUGAR ejecutado');

  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'test-results/tomboexpress-05-cupon-generado.png', fullPage: true });
  console.log('🎉 ¡Test de Tombo Express completado exitosamente!');
});  
});
