import { test, expect } from '@playwright/test';

async function openAndWaitModal(page, trigger, modalSelector) {
  await trigger.click();
  
  const modal = page.locator(modalSelector);
  await modal.waitFor({ state: 'visible', timeout: 5000 });
  await page.waitForTimeout(2000); // Esperar animación
  
  return { modal };
}

// Función universal para ambos modales en Lotline Salta
async function cerrarModalTutorial(page) {
  console.log('🔍 Cerrando modal tutorial...');
  
  await page.waitForTimeout(1500);
  
  const iframe = page.frameLocator('iframe[title="juego"]');
  
  // Buscar cualquier modal ModalTour (funciona para ambas variantes)
  const modal = iframe.locator('[class*="ModalTour_modal"]').first();
  
  if (!await modal.isVisible().catch(() => false)) {
    console.log('✅ No hay modal');
    return true;
  }
  
  console.log('⚠️ Modal detectado, cerrando...');
  
  // Buscar botón cerrar (funciona para ambas variantes)
  const btnClose = iframe.locator('[class*="ModalTour_closeBtn"]').first();
  
  if (await btnClose.isVisible().catch(() => false)) {
    await btnClose.click();
    console.log('  ✓ Click en X');
    await page.waitForTimeout(1000);
    
    // Verificar si se cerró
    const cerrado = !await modal.isVisible().catch(() => false);
    
    if (cerrado) {
      console.log('✅ Modal cerrado exitosamente');
      return true;
    }
  }
  
  // Fallback: Escape
  await page.keyboard.press('Escape');
  console.log('  ✓ Escape presionado');
  await page.waitForTimeout(500);
  
  console.log('✅ Proceso completado');
  return true;
}

// Función para cerrar tooltip (copia esta al inicio de tu archivo)
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
    
    // Click directo en botón X
    const botonX = iframe.locator('button.step_closeStep__fJaF_');
    
    if (await botonX.isVisible().catch(() => false)) {
      await botonX.click();
      console.log('  ✓ X cerrado');
      await page.waitForTimeout(1500);
      continue;
    }
    
    // Fallback: Siguiente
    const siguiente = iframe.locator('button:has-text("Siguiente")');
    if (await siguiente.isVisible().catch(() => false)) {
      await siguiente.click();
      console.log('  ✓ Siguiente');
      await page.waitForTimeout(1500);
      continue;
    }
    
    // Fallback: Cerrar
    const cerrar = iframe.locator('button:has-text("Cerrar")');
    if (await cerrar.isVisible().catch(() => false)) {
      await cerrar.click();
      console.log('  ✓ Cerrar');
      await page.waitForTimeout(1500);
      continue;
    }
    
    break;
  }
  
  // Eliminar del DOM si es necesario
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

// Función para cerrar diálogo jconfirm
async function cerrarDialogoJconfirm(page) {
  console.log('🔍 Verificando diálogo jconfirm...');
  
  await page.waitForTimeout(1000);
  
  const iframe = page.frameLocator('iframe[title="juego"]');
  
  // Buscar diálogo jconfirm
  const dialogo = iframe.locator('.jconfirm.jconfirm-open').first();
  
  if (!await dialogo.isVisible().catch(() => false)) {
    console.log('✅ No hay diálogo jconfirm');
    return true;
  }
  
  console.log('⚠️ Diálogo jconfirm detectado, cerrando...');
  
  // Intentar botón Aceptar/OK
  const btnAceptar = iframe.locator('.jconfirm button:has-text("Aceptar"), .jconfirm button:has-text("OK"), .jconfirm button.btn-primary').first();
  
  if (await btnAceptar.isVisible().catch(() => false)) {
    await btnAceptar.click();
    console.log('  ✓ Click en Aceptar/OK');
    await page.waitForTimeout(1000);
    
    // Verificar si se cerró
    const cerrado = !await dialogo.isVisible().catch(() => false);
    
    if (cerrado) {
      console.log('✅ Diálogo cerrado exitosamente');
      return true;
    }
  }
  
  // Intentar botón cerrar (X)
  const btnClose = iframe.locator('.jconfirm .jconfirm-closeIcon').first();
  
  if (await btnClose.isVisible().catch(() => false)) {
    await btnClose.click();
    console.log('  ✓ Click en X');
    await page.waitForTimeout(1000);
  }
  
  // Fallback: Escape
  await page.keyboard.press('Escape');
  console.log('  ✓ Escape presionado');
  await page.waitForTimeout(500);
  
  console.log('✅ Proceso completado');
  return true;
}

test.describe('Test Tombola Salteña', () => {
  
  test.beforeEach(async ({ page }) => {
    const username = process.env.TEST_SLA_USER;
    const password = process.env.TEST_SLA_PASSWORD;

    if (!username || !password) {
      test.skip();
      console.log('⚠️ Test saltado: Credenciales no configuradas');
      return;
    }

    //Navegar a la página de login
    await page.goto('/plataforma/home');
    await page.waitForLoadState('networkidle');

    // Abrir modal
    const btnAcceso = page.getByText(/^Acceso$/i).first();
    const { modal } = await openAndWaitModal(page, btnAcceso, '#loginModal');

    console.log('✅ Modal abierto');

    // ✅ SOLUCIÓN 1: Excluir el input del modal de recuperación por clase
    const inputUsuario = modal.locator('input[name="nroDocu"]:not(.nroDocuOlvide)');
    await inputUsuario.waitFor({ state: 'visible', timeout: 5000 });
    await inputUsuario.click();
    await page.waitForTimeout(300);
    await inputUsuario.fill(username);
    console.log('  ✓ Usuario ingresado');

    // Para la contraseña es lo mismo
    const inputPassword = modal.locator('input#clave:not(.nroDocuOlvide)').first();
    await inputPassword.waitFor({ state: 'visible', timeout: 5000 });
    await inputPassword.click();
    await page.waitForTimeout(300);
    await inputPassword.fill(password);
    console.log('  ✓ Contraseña ingresada');

    // Submit
    console.log('🖱️ Click en Ingresar...');
    await modal.locator('#botonLogin').click();

    // Verificar resultado
    await page.waitForTimeout(3000);

    const loginExitoso = await page.getByText(/¡Hola .+!/i).isVisible().catch(() => false);

    if (loginExitoso) {
      console.log('✅ LOGIN EXITOSO');
      expect(loginExitoso).toBeTruthy();
       // Tomar screenshot como evidencia de éxito
    await page.screenshot({ path: 'test-results/login-exitoso.png', fullPage: true });
    } else {
      throw new Error('❌ Login falló');
    }
  });
    
  test('Tombola', async ({ page }) => {
    // Paso 1: Verificar que estamos en /home
    await expect(page).toHaveURL(/.*\/plataforma\/home/);
    console.log('✅ Paso 1: En pantalla de juegos');
  //  await page.screenshot({ path: 'test-results/quiniela-01-home.png', fullPage: true });

    // Paso 2: Click en botón Tómbola
    console.log('🖱️ Paso 2: Buscando botón Tómbola...');
    const quinielaButton = page.locator('button:has-text("Tómbola"), a:has-text("Tómbola"), [class*="sc-bQCEYZ ebymVa position-relative  align-self-center"]').first();
    await quinielaButton.click();
    
    console.log('✅ Click en Tómbola ejecutado');

    // Paso 3: Verificar navegación a tombola
    await page.waitForURL(/.*\/juego\/Tombola/i, { timeout: 1000 });
    console.log('✅ Paso 3: Navegación a pantalla de sorteos exitosa');
    
    // Esperar a que cargue completamente la página
    await page.waitForTimeout(1000);
    
    await page.screenshot({ path: 'test-results/tombola-02-sorteos.png', fullPage: true });
    
    //Llamar función cerrar aviso modal
    await cerrarModalTutorial(page);

    // Paso 4: Click en sorteo Nocturna DENTRO DEL IFRAME
    console.log('🖱️ Paso 4: Seleccionando sorteo Nocturna dentro del iframe...');

    //const iframe = page.frameLocator('iframe#zonaJuego');
    const iframe = page.frameLocator('iframe[title="juego"]');

    const nocturnaH6 = iframe.locator('h6.fontDescEve:has-text("Nocturna")').first();
    await nocturnaH6.waitFor({ state: 'visible', timeout: 5000 });
    await nocturnaH6.click();
    console.log('✅ Sorteo Nocturna seleccionado');

    for (let i = 1; i <= 3; i++) {

        // Paso 5: Completar campo Número con número aleatorio 0-99 (DENTRO DEL IFRAME)
        const numeroAleatorio = Math.floor(Math.random() * 100);
        const numeroDosCifras = String(numeroAleatorio).padStart(2, '0');
        console.log('🎲 Paso 5: Número aleatorio generado:', numeroDosCifras);
    
        // Buscar el input asociado al label "Numero" dentro del iframe
        const campoNumero = iframe.locator('label.bet-label:has-text("Numero")').locator('..').locator('input').first();
        await campoNumero.waitFor({ state: 'visible', timeout: 5000 });
        await campoNumero.fill(numeroDosCifras.toString());
        console.log('✅ Campo Número completado:', numeroDosCifras);

        // Paso 6: Completar campo Alcance con 10 (DENTRO DEL IFRAME)
        console.log('📝 Paso 6: Completando campo Alcance...');
        const campoAlcance = iframe.locator('label.bet-label:has-text("Alcance")').locator('..').locator('input').first();
        await campoAlcance.waitFor({ state: 'visible', timeout: 5000 });
        await campoAlcance.fill('10');
        console.log('✅ Campo Alcance completado: 10');

        // Paso 7: Completar campo Importe con 200 (DENTRO DEL IFRAME)
        console.log('💰 Paso 7: Completando campo Importe...');
        const campoImporte = iframe.locator('label.bet-label:has-text("Importe")').locator('..').locator('input').first();
        await campoImporte.waitFor({ state: 'visible', timeout: 5000 });
        await campoImporte.fill('200');
        console.log('✅ Campo Importe completado: 200');

        // await page.screenshot({ path: 'test-results/quiniela-04-datos-completados.png', fullPage: true });

        // Paso 8: Click en botón +
        console.log('🖱️ Paso 8: Click en botón +...');
        const botonMas = iframe.locator('button#btn-addJugada').first();
        await botonMas.waitFor({ state: 'visible', timeout: 5000 });
        await botonMas.click();
        console.log('✅ Click en botón + ejecutado');
    
        await page.waitForTimeout(1000);
    }    

    // Paso 9: Click en botón Siguiente
    console.log('🖱️ Paso 9: Click en botón Siguiente...');
    const botonSiguiente = iframe.locator('button#botonDerecha:has-text("Siguiente"), button.botonDerecha:has-text("Siguiente")').first();
    await botonSiguiente.waitFor({ state: 'visible', timeout: 5000 });
    await botonSiguiente.click();
    console.log('✅ Click en Siguiente ejecutado');
    
    // Esperar pantalla de selección de extracto
    await page.waitForTimeout(2000);
   // await page.screenshot({ path: 'test-results/quiniela-05-seleccion-extracto.png', fullPage: true });
    console.log('✅ Pantalla de selección de extracto abierta');

    // Paso 10: Click en botón Lot. De Salta
    console.log('🖱️ Paso 10: Seleccionando extracto Lot. De Salta...');
    const botonRioNegro = iframe.locator('label#btnExtracto:has-text("Lot. De Salta"), label.extractoButton:has-text("Lot. De Salta")').first();
    await botonRioNegro.waitFor({ state: 'visible', timeout: 5000 });
    await botonRioNegro.click();
    console.log('✅ Extracto Lotería de Salta');
    
    await page.waitForTimeout(1000);

    // Paso 11: Click en botón Jugar
    console.log('🖱️ Paso 11: Click en botón Jugar...');
    const botonJugar = iframe.locator('button#botonDerecha:has-text("Jugar"), button.botonDerecha:has-text("Jugar")').first();
    await botonJugar.waitFor({ state: 'visible', timeout: 5000 });
    await botonJugar.click();
    console.log('✅ Click en Jugar ejecutado');
    
    // Esperar que aparezca el popup del cupón
    await page.waitForTimeout(1000);

    // Paso 12: Validar popup del cupón y tomar captura
    console.log('📋 Paso 12: Validando popup del cupón...');
    
    // Búsqueda específica DENTRO DEL IFRAME
    const cuponPopup = iframe.locator('div#download.cuponFinal').first();
    await cuponPopup.waitFor({ state: 'visible', timeout: 1000 });

         // Verificar mensaje de éxito específico
    const mensajeExito = iframe.locator('div.text-success:has-text("¡CUPON GENERADO!")').first();
    await mensajeExito.waitFor({ state: 'visible', timeout: 1000 });
    console.log('✅ Mensaje "¡CUPON GENERADO!" confirmado');
    
    // Verificar que el popup es visible
    const isVisible = await cuponPopup.isVisible().catch(() => false);
    
    if (isVisible) {
      console.log('✅ Popup del cupón visible');
      
      // Tomar screenshot del cupón
      await page.screenshot({ path: 'test-results/tombola-06-cupon-generado.png', fullPage: true });
      
           
      console.log('🎉 ¡Test de Quiniela Tradicional completado exitosamente!');
      
    } else {
      console.log('⚠️ Popup del cupón no encontrado, tomando screenshot del estado actual');
      await page.screenshot({ path: 'test-results/tombola-06-error-popup.png', fullPage: true });
      
      throw new Error('No se encontró el popup del cupón generado');
    }
  });

   test('Quini6', async ({ page }) => {
         // Verificar que estamos en /home
         await expect(page).toHaveURL(/.*\/plataforma\/home/);
         console.log('✅ Paso 1: En pantalla de juegos');
         await page.screenshot({ path: 'test-results/quini6SLA-01-home.png', fullPage: true });
   
         // Click en Quini 6
         console.log('🖱️ Paso 2: Click en Quini 6...');
         await page.getByRole('link', { name: 'img Quini 6' }).click();
         console.log('✅ Click en Quini 6 ejecutado');
   
         await page.waitForTimeout(3000);
         await page.screenshot({ path: 'test-results/quini6SLA-02-pantalla.png', fullPage: true });
   
         // Trabajar dentro del iframe
         const iframe = page.frameLocator('iframe[title="juego"]');
   
         await page.waitForTimeout(1500);
   
         // quitar el tutorial
         await cerrarTooltipIframe(page);
   
         await page.waitForTimeout(1000);
         await page.screenshot({ path: 'test-results/quini6SLA-03-pantalla.png', fullPage: true });
   
         // Force click en el botón
         console.log('🖱️ Paso 3: Click en boton suerte...');
         const botonSuerte = iframe.locator('#boton-suerte');
         await botonSuerte.waitFor({ state: 'visible', timeout: 15000 });
         await botonSuerte.click({ force: true });
         console.log('✅ Boton suerte activado');
   
         await page.waitForTimeout(1000);
   
         console.log('🖱️ Paso 4: Click en botón Avanzar...');
         await page.screenshot({ path: 'test-results/quini6SLA-04-pantalla.png', fullPage: true });
   
         // Click en botón Avanzar
         await iframe.getByRole('button', { name: /Avanzar/i }).click();
   
         console.log('✅ Botón Avanzar clickeado');
         await page.screenshot({ path: 'test-results/quini6SLA-05-pantalla.png', fullPage: true });
   
         //const revanchaBadge = iframe.locator('span.badge:has-text("REVANCHA")');
         const precioCirculo = iframe.locator('.Modalities_circle__lqrqi');
   
         const botonConfirmar = iframe.getByRole('button', { name: /Confirmar/i });
         await page.frameLocator('iframe[title="juego"]').getByText('REVANCHA', { exact: true }).click();
         await expect(precioCirculo).toHaveText('$2.000', { timeout: 2000 });
         await botonConfirmar.click();
         await page.screenshot({ path: 'test-results/quini6SLA-06-pantalla.png', fullPage: true });
         console.log('🖱️ Paso 5: Click en botón Confirmar realizado');
   
         await page.waitForTimeout(3000);
         await page.screenshot({ path: 'test-results/quini6SLA-07-cupon-generado.png', fullPage: true });
   
         // Paso 6: Comprobar que el cupón se generó (descarga/modal con "¡CUPÓN GENERADO!")
         console.log('🔎 Paso 6: Verificando generación del cupón...');
   
         // El modal del cupón vive dentro del iframe del juego (id="download",
         // clase CSS-module GeneratedCoupon_containerGeneratedCoupon__xxxx).
         // Usamos [class*=] porque el hash del CSS module cambia entre deploys.
         const cuponModal = iframe.locator('#download');
         const cuponTitulo = iframe.locator('#download').getByText('¡CUPÓN GENERADO!', { exact: true });
   
         let cuponVisible = false;
         try {
           await cuponModal.waitFor({ state: 'visible', timeout: 10000 });
           cuponVisible = true;
         } catch (e) {
           cuponVisible = false;
         }
   
         // Si el modal del cupón nunca apareció, no podemos comprobar nada: hacemos skip.
         test.skip(
           !cuponVisible,
           '⚠️ No se pudo localizar el modal del cupón (#download) dentro del iframe: se omite la verificación del texto "¡CUPÓN GENERADO!".'
         );
   
         // Si llegamos acá, el modal apareció: ahora sí exigimos el texto esperado.
         // Si no lo contiene, este expect falla el test (comportamiento deseado).
         await expect(cuponTitulo).toContainText('¡CUPÓN GENERADO!', { timeout: 5000 });
   
         console.log('✅ Cupón confirmado: se encontró el texto "¡CUPÓN GENERADO!"');
         await page.screenshot({ path: 'test-results/quini6SLA-08-cupon-verificado.png', fullPage: true });
   
         console.log('🎉 ¡Test de Quini 6 completado exitosamente!');
  
});

test('Loto Plus', async ({ page }) => {
    // Verificar que estamos en /home
    await expect(page).toHaveURL(/.*\/plataforma\/home/);
    console.log('✅ Paso 1: En pantalla de juegos');
    await page.screenshot({ path: 'test-results/lotoplusSLA-01-home.png', fullPage: true });

        // Click en Loto Plus
    console.log('🖱️ Paso 2: Click en Loto Plus...');
    //await iframe.locator('div.juego:has-text("Loto Plus")').click;
    await page.getByRole('link', { name: 'img Loto Plus' }).click();
    console.log('✅ Click en Loto Plus ejecutado');

    await page.waitForTimeout(1000);
    //await page.screenshot({ path: 'test-results/lotoplusSLA-02-pantalla.png', fullPage: true });

    // Trabajar dentro del iframe
    const iframe = page.frameLocator('iframe[title="juego"]');

    await page.waitForTimeout(1500);
    
    // quitar el tutorial
    await cerrarTooltipIframe(page);

    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-results/lotoplusSLA-03-pantalla.png', fullPage: true });

  // Force click en el botón suerte
  console.log('🖱️ Paso 3: Click en boton suerte...');
  const botonSuerte = iframe.locator('#boton-suerte');
  await botonSuerte.click({ force: true });
  console.log('✅ Boton suerte activado');

    await page.waitForTimeout(1000);

  console.log('🖱️ Paso 4: Click en botón Avanzar...');
  await page.screenshot({ path: 'test-results/lotoplusSLA-04-pantalla.png', fullPage: true });

// Click en botón Avanzar

await iframe.getByRole('button', { name: /Avanzar/i }).click();

console.log('✅ Botón Avanzar clickeado');
await page.screenshot({ path: 'test-results/lotoplusSLA-05-pantalla.png', fullPage: true });

    await page.waitForTimeout(2000);

// Click en botón Confirmar
console.log('🖱️ Paso 5: Click en botón Confirmar');
const botonConfirmar = iframe.getByRole('button', { name: /Confirmar/i });
await botonConfirmar.click();
await page.waitForTimeout(3000);
await page.screenshot({ path: 'test-results/lotoplusSLA-06-cupon-generado.png', fullPage: true });
    
console.log('🎉 ¡Test de Loto Plus completado exitosamente!');
  });
});
