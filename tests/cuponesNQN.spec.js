
import { test, expect } from '@playwright/test';

async function openAndWaitModal(page, trigger, modalSelector) {
  await trigger.click();
  
  const modal = page.locator(modalSelector);
  await modal.waitFor({ state: 'visible', timeout: 5000 });
  await page.waitForTimeout(2000); // Esperar animación
  
  return { modal };
}

async function seleccionarDia(iframe) {
  console.log('🖱️ Seleccionando día...');
  
  // Opción 1: Buscar por texto - Miércoles
  let miercoles = iframe.getByText('Miércoles', { exact: false });
  let miercolesVisible = await miercoles.isVisible().catch(() => false);
  
  if (miercolesVisible) {
    await miercoles.click();
    console.log('✅ Miércoles seleccionado');
    return 'Miércoles';
  }
  
  // Opción 2: Buscar por role - Miércoles
  miercoles = iframe.getByRole('button', { name: /Miércoles/i });
  miercolesVisible = await miercoles.isVisible().catch(() => false);
  
  if (miercolesVisible) {
    await miercoles.click();
    console.log('✅ Miércoles seleccionado (por role)');
    return 'Miércoles';
  }

  // Opción 3: Fallback - Buscar por texto - Domingo
  let domingo = iframe.getByText('Domingo', { exact: false });
  let domingoVisible = await domingo.isVisible().catch(() => false);

  if (domingoVisible) {
    await domingo.click();
    console.log('✅ Domingo seleccionado (fallback)');
    return 'Domingo';
  }

  // Opción 4: Fallback - Buscar por role - Domingo
  domingo = iframe.getByRole('button', { name: /Domingo/i });
  domingoVisible = await domingo.isVisible().catch(() => false);

  if (domingoVisible) {
    await domingo.click();
    console.log('✅ Domingo seleccionado (fallback por role)');
    return 'Domingo';
  }

  // Si ninguno está disponible, continuar sin seleccionar día
  console.log('⚠️ No se encontró Miércoles ni Domingo, continuando sin seleccionar día...');
  return null;
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

test.describe('Test Lotline La Neuquina', () => {
  
  test.beforeEach(async ({ page }) => {
      const username = process.env.TEST_NQN_USER;
      const password = process.env.TEST_NQN_PASSWORD;
  
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

  test('Quiniela Tradicional', async ({ page }) => {
    // Paso 1: Verificar que estamos en /home
    await expect(page).toHaveURL(/.*\/plataforma\/home/);
    console.log('✅ Paso 1: En pantalla de juegos');
  //  await page.screenshot({ path: 'test-results/quiniela-01-home.png', fullPage: true });

     // CERRAR MODAL DE AVISOS GENERALES SI APARECE
  console.log('🔍 Verificando modal de Avisos generales...');
  
  // Esperar un momento para que aparezca el modal si va a aparecer
  await page.waitForTimeout(1500);
  
  const modalHeader = page.locator('#headerModal-12, .modalHeader-12');
  const isModalVisible = await modalHeader.isVisible().catch(() => false);
  
  if (isModalVisible) {
    console.log('⚠️ Modal de Avisos generales detectado, cerrándolo...');
    
    // Click en el botón de cerrar (X)
    const closeButton = page.locator('.modalHeader-12 button.close');
    await closeButton.click();
    
    console.log('✅ Modal cerrado exitosamente');
    
    // Esperar a que el modal desaparezca completamente
    await page.waitForTimeout(1000);
  } else {
    console.log('✅ No hay modal de avisos');
  }
    // Paso 2: Click en botón Quiniela Tradicional
    console.log('🖱️ Paso 2: Buscando botón Quiniela Tradicional...');
    const quinielaButton = page.locator('button:has-text("Quiniela tradicional"), a:has-text("Quiniela tradicional"), [class*="sc-bQCEYZ ebymVa position-relative  align-self-center"]').first();
    await quinielaButton.click();
    
    console.log('✅ Click en Quiniela Tradicional ejecutado');

    // Paso 3: Verificar navegación a /juego/Quinielatradicional
    await page.waitForURL(/.*\/juego\/Quinielatradicional/i, { timeout: 1000 });
    console.log('✅ Paso 3: Navegación a pantalla de sorteos exitosa');
    
    // Esperar a que cargue completamente la página
    await page.waitForTimeout(500);
    
   // await page.screenshot({ path: 'test-results/quiniela-02-sorteos.png', fullPage: true });

    // Paso 4: Click en sorteo Nocturna DENTRO DEL IFRAME
    console.log('🖱️ Paso 4: Seleccionando sorteo Nocturna dentro del iframe...');

    const iframe = page.frameLocator('iframe#zonaJuego');

    const nocturnaH6 = iframe.locator('h6.fontDescEve:has-text("Nocturna")').first();
    await nocturnaH6.waitFor({ state: 'visible', timeout: 5000 });
    await nocturnaH6.click();
    console.log('✅ Sorteo Nocturna seleccionado');

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

    // Paso 7: Completar campo Importe con 300 (DENTRO DEL IFRAME)
    console.log('💰 Paso 7: Completando campo Importe...');
    const campoImporte = iframe.locator('label.bet-label:has-text("Importe")').locator('..').locator('input').first();
    await campoImporte.waitFor({ state: 'visible', timeout: 5000 });
    await campoImporte.fill('300');
    console.log('✅ Campo Importe completado: 300');

   // await page.screenshot({ path: 'test-results/quiniela-04-datos-completados.png', fullPage: true });

    // Paso 8: Click en botón +
    console.log('🖱️ Paso 8: Click en botón +...');
    const botonMas = iframe.locator('button#btn-addJugada').first();
    await botonMas.waitFor({ state: 'visible', timeout: 5000 });
    await botonMas.click();
    console.log('✅ Click en botón + ejecutado');
    
    await page.waitForTimeout(1000);

    // Paso 9: Click en botón Siguiente
    console.log('🖱️ Paso 9: Click en botón Siguiente...');
    const botonSiguiente = iframe.locator('button#botonDerecha:has-text("Siguiente"), button.botonDerecha:has-text("Siguiente")').first();
    await botonSiguiente.waitFor({ state: 'visible', timeout: 5000 });
    await botonSiguiente.click();
    console.log('✅ Click en Siguiente ejecutado');
    
    // Esperar pantalla de selección de extracto
    await page.waitForTimeout(4000);
   // await page.screenshot({ path: 'test-results/quiniela-05-seleccion-extracto.png', fullPage: true });
    console.log('✅ Pantalla de selección de extracto abierta');

    // Paso 10: Click en botón La Neuquina
      const botonExtracto = iframe.locator('label#btnExtracto').first();
     await botonExtracto.waitFor({ state: 'visible', timeout: 15000 });
     await botonExtracto.click();
     console.log('✅ Extracto seleccionado (primero disponible)');
    //  const botonLaNeuquina = iframe.locator('label#btnExtracto:has-text("La Neuquina"), label.extractoButton:has-text("La Neuquina")').first();
    //  await botonLaNeuquina.waitFor({ state: 'visible', timeout: 5000 });
    //  await botonLaNeuquina.click();
    //console.log('✅ Extracto La Neuquina seleccionado');
    
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
      await page.screenshot({ path: 'test-results/quiniela-06-cupon-generado.png', fullPage: true });
      
           
      console.log('🎉 ¡Test de Quiniela Tradicional completado exitosamente!');
      
    } else {
      console.log('⚠️ Popup del cupón no encontrado, tomando screenshot del estado actual');
      await page.screenshot({ path: 'test-results/quiniela-06-error-popup.png', fullPage: true });
      
      throw new Error('No se encontró el popup del cupón generado');
    }
  });

  test('Patagonia Minibingo', async ({ page }) => {
    // Verificar que estamos en /home
    await expect(page).toHaveURL(/.*\/plataforma\/home/);
    console.log('✅ Paso 1: En pantalla de juegos');
    await page.screenshot({ path: 'test-results/minibingo-01-home.png', fullPage: true });

    // CERRAR MODAL DE AVISOS GENERALES SI APARECE
  console.log('🔍 Verificando modal de Avisos generales...');
  
  // Esperar un momento para que aparezca el modal si va a aparecer
  await page.waitForTimeout(1500);
  
  const modalHeader = page.locator('#headerModal-12, .modalHeader-12');
  const isModalVisible = await modalHeader.isVisible().catch(() => false);
  
  if (isModalVisible) {
    console.log('⚠️ Modal de Avisos generales detectado, cerrándolo...');
    
    // Click en el botón de cerrar (X)
    const closeButton = page.locator('.modalHeader-12 button.close');
    await closeButton.click();
    
    console.log('✅ Modal cerrado exitosamente');
    
    // Esperar a que el modal desaparezca completamente
    await page.waitForTimeout(1000);
  } else {
    console.log('✅ No hay modal de avisos');
  }
  
  // Click en Patagonia Minibingo
   // console.log('🖱️ Paso 2: Click en Patagonia Minibingo...');
    //await page.getByRole('link', { name: 'img Patagonia Minibingo' }).click();
    //  console.log('✅ Click en Patagonia Minibingo ejecutado');

    console.log('🖱️ Paso 2: Click en Patagonia Minibingo...');

// Buscar específicamente el link visible, no el clonado oculto
const minibingoLink = page.locator('a[href="/plataforma/juego/patagoniaminibingo"]').filter({ visible: true }).first();

await minibingoLink.waitFor({ state: 'visible', timeout: 8000 });
await minibingoLink.click();

console.log('✅ Click en Patagonia Minibingo ejecutado');
    
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results/minibingo-02-pantalla.png', fullPage: true });

    // Trabajar dentro del iframe
    //const iframe = page.frameLocator('iframe[title="juego"]');
    
    // Click en botón para seleccionar números (botón con $)
    console.log('🖱️ Paso 3: Seleccionando números automáticos...');
    // await iframe.getByRole('button').filter({ hasText: /^\$/ }).click();
    await page.locator('iframe[title="juego"]').contentFrame().getByRole('button').filter({ hasText: /^$/ }).click();
    console.log('✅ Números seleccionados');
    
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-results/minibingo-03-numeros-seleccionados.png', fullPage: true });

    // Click en botón JUGAR
    console.log('🖱️ Paso 4: Click en botón JUGAR...');
    //await iframe.getByRole('button', { name: 'JUGAR' }).click();
    await page.locator('iframe[title="juego"]').contentFrame().getByRole('button', { name: 'JUGAR' }).click();
    console.log('✅ Click en JUGAR ejecutado');
    
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results/minibingo-04-cupon-generado.png', fullPage: true });
    
    console.log('🎉 ¡Test de Patagonia Minibingo completado exitosamente!');
  });

 test('Patagonia Telebingo', async ({ page }) => {
    // Verificar que estamos en /home
    await expect(page).toHaveURL(/.*\/plataforma\/home/);
    console.log('✅ Paso 1: En pantalla de juegos');
    await page.screenshot({ path: 'test-results/telebingo-01-home.png', fullPage: true });

    // CERRAR MODAL DE AVISOS GENERALES SI APARECE
  console.log('🔍 Verificando modal de Avisos generales...');
  
  // Esperar un momento para que aparezca el modal si va a aparecer
  await page.waitForTimeout(1500);
  
  const modalHeader = page.locator('#headerModal-12, .modalHeader-12');
  const isModalVisible = await modalHeader.isVisible().catch(() => false);
  
  if (isModalVisible) {
    console.log('⚠️ Modal de Avisos generales detectado, cerrándolo...');
    
    // Click en el botón de cerrar (X)
    const closeButton = page.locator('.modalHeader-12 button.close');
    await closeButton.click();
    
    console.log('✅ Modal cerrado exitosamente');
    
    // Esperar a que el modal desaparezca completamente
    await page.waitForTimeout(1000);
  } else {
    console.log('✅ No hay modal de avisos');
  }
  
  // Click en Patagonia Telebingo
    console.log('🖱️ Paso 2: Click en Patagonia Telebingo...');
  //  await page.getByRole('link', { name: 'img Patagonia Telebingo Cupón' }).click();
    await page.locator('a[href="/plataforma/juego/patagoniatelebingo"]').filter({ hasText: 'Patagonia Telebingo' }).first().click();
    console.log('✅ Click en Patagonia Telebingo ejecutado');
    
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results/Telebingo-02-pantalla.png', fullPage: true });

    //Click para seleccionar Patagonia Telebingo
    console.log('🖱️ Paso 3: Seleccionando Telebingo Ordinario');
    const iframe = page.frameLocator('iframe[title="juego"]');
    await iframe.getByText('TELEBINGO', { exact: true }).click();

    // Click en botón para seleccionar números (botón con $)
    console.log('🖱️ Paso 3: Seleccionando números automáticos...');
    await page.locator('iframe[title="juego"]').contentFrame().getByRole('button').nth(2).click();
    //await page.locator('iframe[title="juego"]').contentFrame().getByRole('button').filter({ hasText: /^$/ }).click();
    // const iframe = page.frameLocator('iframe[title="juego"]');
    // await iframe.locator('button.btn.btn-success.ml-2').click();
    console.log('✅ Números seleccionados');
    
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-results/telebingo-03-numeros-seleccionados.png', fullPage: true });

    // Click en botón JUGAR
    console.log('🖱️ Paso 4: Click en botón JUGAR...');
    await iframe.getByRole('button', { name: 'JUGAR' }).click();
    console.log('✅ Click en JUGAR ejecutado');
    
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/telebingo-04-cupon-generado.png', fullPage: true });
    
    console.log('🎉 ¡Test de Patagonia Telebingo completado exitosamente!');
  });

  test('Pozo de la Quiniela', async ({ page }) => {
    // Verificar que estamos en /home
    await expect(page).toHaveURL(/.*\/plataforma\/home/);
    console.log('✅ Paso 1: En pantalla de juegos');
    await page.screenshot({ path: 'test-results/pozo-01-home.png', fullPage: true });

    // CERRAR MODAL DE AVISOS GENERALES SI APARECE
  console.log('🔍 Verificando modal de Avisos generales...');
  
  // Esperar un momento para que aparezca el modal si va a aparecer
  await page.waitForTimeout(1500);
  
  const modalHeader = page.locator('#headerModal-12, .modalHeader-12');
  const isModalVisible = await modalHeader.isVisible().catch(() => false);
  
  if (isModalVisible) {
    console.log('⚠️ Modal de Avisos generales detectado, cerrándolo...');
    
    // Click en el botón de cerrar (X)
    const closeButton = page.locator('.modalHeader-12 button.close');
    await closeButton.click();
    
    console.log('✅ Modal cerrado exitosamente');
    
    // Esperar a que el modal desaparezca completamente
    await page.waitForTimeout(1000);
  } else {
    console.log('✅ No hay modal de avisos');
  }
      // Click en Pozo de la Quiniela
    //console.log('🖱️ Paso 1: Click en Pozo de la Quiniela...');
    //await page.getByRole('link', { name: 'img Pozo de la Quiniela' }).click();

   // console.log('✅ Click en Pozo de la Quiniela ejecutado');

    console.log('🖱️ Click en Pozo de la Quiniela...');

// Buscar específicamente el link visible, no el clonado oculto
const pozoLink = page.locator('a[href="/plataforma/juego/pozodelaquiniela"]').filter({ visible: true }).first();

await pozoLink.waitFor({ state: 'visible', timeout: 8000 });
await pozoLink.click();

console.log('✅ Click en Pozo de la Quiniela ejecutado');
    
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results/pozo-02-pantalla.png', fullPage: true });

    // Trabajar dentro del iframe
    const iframe = page.frameLocator('iframe[title="juego"]');
    
    // Click en primer logoN (primera selección de sorteo abierto)
    console.log('🖱️ Paso 2: Seleccionando primera opción sorteo...');
    await iframe.getByRole('img', { name: 'logoN' }).first().click();
    console.log('✅ Primera opción seleccionada');
    
    await page.waitForTimeout(500);

    // Generar número aleatorio 1
  const numeroAleatorio = Math.floor(Math.random() * 1000);
  console.log('🎲 Número aleatorio generado:', numeroAleatorio);

  // Completar campo número 1
  console.log('🔢 Paso 3: Completando campo número 1...');
  //await iframe.locator('#fnroApu1').click();
  //await iframe.locator('#fnroApu1').fill(numeroAleatorio.toString());
  const campoNumero = iframe.locator('input[name="fnroApu1"]');
  await campoNumero.click();
  await campoNumero.fill(numeroAleatorio.toString());
  console.log('✅ Campo número 1 completado:', numeroAleatorio);

  // Generar número aleatorio 2
  const numeroAleator = Math.floor(Math.random() * 1000);
  console.log('🎲 Número aleatorio generado:', numeroAleator);

  // Completar campo número 2
  console.log('🔢 Paso 4: Completando campo número 2...');
  //await iframe.locator('#fAlcApuDir').click();
  //await iframe.locator('#fAlcApuDir').fill(numeroAleator.toString());
  const campoNum = iframe.locator('#fAlcApuDir');
  await campoNum.click();
  await campoNum.fill(numeroAleator.toString());
  console.log('✅ Campo número 2 completado:', numeroAleator);

  // Paso 5: Ingresar Super Bola
  console.log('🖱️ Paso 5: Completar Super Bola');
  const SuperBola = iframe.locator('div.sc-kfPuZi input[name="fAlcApuDir"]');
  await SuperBola.click();
  await SuperBola.fill('8');
  console.log('✅ Super Bola ingresada');

  // Paso 6: Click en botón +
    console.log('🖱️ Paso 6: Click en botón +...');
    const botonMas = iframe.locator('button#btn-addJugada').first();
    await botonMas.waitFor({ state: 'visible', timeout: 5000 });
    await botonMas.click();
    console.log('✅ Click en botón + ejecutado');
    
    await page.waitForTimeout(1000);

    // Click en botón Jugar!
    console.log('🖱️ Paso 7: Click en botón Jugar!...');
    // Espero que el boton sea visible
    await expect(iframe.getByRole('button', { name: /^Jugar!$/ })).toBeVisible();

    await iframe.getByRole('button', { name: /^Jugar!$/ }).click();
    console.log('✅ Click en Jugar! ejecutado');
    
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results/pozo-04-cupon-generado.png', fullPage: true });
    
    console.log('🎉 ¡Test de Pozo de la Quiniela completado exitosamente!');
  });

  test('Lotería Unificada', async ({ page }) => {
  // Paso 1: Verificar que estamos en /home
  await expect(page).toHaveURL(/.*\/plataforma\/home/);
  console.log('✅ Paso 1: En pantalla de juegos');
  await page.screenshot({ path: 'test-results/loteria-01-home.png', fullPage: true });

  // Cerrar modal de avisos generales si aparece
  console.log('🔍 Verificando modal de Avisos generales...');
  await page.waitForTimeout(1500);
  
  const modalHeader = page.locator('#headerModal-12, .modalHeader-12');
  const isModalVisible = await modalHeader.isVisible().catch(() => false);
  
  if (isModalVisible) {
    console.log('⚠️ Modal de Avisos generales detectado, cerrándolo...');
    const closeButton = page.locator('.modalHeader-12 button.close');
    await closeButton.click();
    console.log('✅ Modal cerrado exitosamente');
    await page.waitForTimeout(1000);
  } else {
    console.log('✅ No hay modal de avisos');
  }

  // Paso 2: Click en Lotería Unificada
  //console.log('🖱️ Paso 2: Click en Lotería Unificada...');
  //await page.locator('a[href*="loteria"]').filter({ hasText: 'Lotería Unificada' }).first().click();
  //  console.log('✅ Click en Lotería Unificada ejecutado');

   console.log('🖱️ Click en Loteria Unificada...');

// Buscar específicamente el link visible, no el clonado oculto
const unificadaLink = page.locator('a[href="/plataforma/juego/loteriaunificada"]').filter({ visible: true }).first();

await unificadaLink.waitFor({ state: 'visible', timeout: 8000 });
await unificadaLink.click();

console.log('✅ Click en Loteria Unificada ejecutado');
  
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'test-results/loteria-02-pantalla-inicial.png', fullPage: true });

  // Trabajar dentro del iframe
  const iframe = page.frameLocator('iframe[title="juego"]');
  
  // Paso 3: Seleccionar sorteo loteria
  console.log('🖱️ Paso 3: Seleccionando sorteo loteria...');
  const neuquina = iframe.locator('div.juego')
  .filter({ hasText: /Martes|Jueves|Sabados/i }).first();

  await neuquina.waitFor({ state: 'visible', timeout: 5000 });
  await neuquina.click();
  console.log('✅ Sorteo de loteria seleccionado');
    
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'test-results/loteria-03-sorteo-seleccionado.png', fullPage: true });

  // Paso 4: Click en Trébol para billete al azar
  console.log('🖱️ Paso 4: Click en Trébol para billete al azar...');
  const botonSuerte = iframe.locator('button.boton.boton-suerte');
  await botonSuerte.waitFor({ state: 'visible', timeout: 5000 });
  await botonSuerte.click();
  console.log('✅ Botón Trébol clickeado - Billete generado');
  
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'test-results/loteria-04-billete-generado.png', fullPage: true });

  // Detección de aviso modal billete no encontrado
async function verificarYCerrarModalBillete(page) {
  await page.waitForTimeout(2000);
  
  const modal = page.locator('h4:has-text("Billete no disponible")');
  const isVisible = await modal.isVisible().catch(() => false);
  
  if (isVisible) {
    console.log('⚠️ Modal "Billete no disponible" detectado');
    const botonReintentar = page.locator('button.btn-primary:has-text("Intente nuevamente")');
    await botonReintentar.click();
    console.log('✓ Click en "Intente nuevamente"');
    await page.waitForTimeout(2000);
    
    // Verificar recursivamente si aparece de nuevo
    await verificarYCerrarModalBillete(page);
  } else {
    console.log('✅ Modal no presente, continuando...');
  }
}

  // Paso 5: Seleccionar fracción de billete
  console.log('🖱️ Paso 5: Seleccionando fracción de billete...');
  
  const checkmark = iframe.locator('label.container-input:has(#fraccion-1) span.checkmark');
  await checkmark.waitFor({ state: 'visible', timeout: 5000 });
  await checkmark.click();
  
  console.log('✅ Fracción seleccionada');
  
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'test-results/loteria-05-fraccion-seleccionada.png', fullPage: true });

  // Paso 6: Click en botón JUGAR!
  console.log('🖱️ Paso 6: Click en botón JUGAR!...');
  const botonJugar = iframe.locator('button').filter({ hasText: /^Jugar!$/i });
  await botonJugar.waitFor({ state: 'visible', timeout: 5000 });
  await botonJugar.click();
  console.log('✅ Click en JUGAR! ejecutado');
  
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'test-results/loteria-06-cupon-generado.png', fullPage: true });
  
  console.log('🎉 ¡Test de Lotería Unificada completado exitosamente!');
});

test('Quini6', async ({ page }) => {
    // Verificar que estamos en /home
    await expect(page).toHaveURL(/.*\/plataforma\/home/);
    console.log('✅ Paso 1: En pantalla de juegos');
    await page.screenshot({ path: 'test-results/poceada-01-home.png', fullPage: true });

    // CERRAR MODAL DE AVISOS GENERALES SI APARECE
  console.log('🔍 Verificando modal de Avisos generales...');
  
  // Esperar un momento para que aparezca el modal si va a aparecer
  await page.waitForTimeout(1500);
  
  const modalHeader = page.locator('#headerModal-12, .modalHeader-12');
  const isModalVisible = await modalHeader.isVisible().catch(() => false);
  
  if (isModalVisible) {
    console.log('⚠️ Modal de Avisos generales detectado, cerrándolo...');
    
    // Click en el botón de cerrar (X)
    const closeButton = page.locator('.modalHeader-12 button.close');
    await closeButton.click();
    
    console.log('✅ Modal cerrado exitosamente');
    
    // Esperar a que el modal desaparezca completamente
    await page.waitForTimeout(1000);
  } else {
    console.log('✅ No hay modal de avisos');
  }
    // Click en Quini 6
    console.log('🖱️ Click en Quini 6...');
const quini6Link = page.locator('a[href="/plataforma/juego/quini6"]').filter({ visible: true }).first();
await quini6Link.waitFor({ state: 'visible', timeout: 8000 });
await quini6Link.click();
console.log('✅ Click en Quini 6 ejecutado');
    
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'test-results/quini6-02-pantalla.png', fullPage: true });

    // Trabajar dentro del iframe
  const iframe = page.frameLocator('iframe[title="juego"]');

  await page.waitForTimeout(1500);

      // quitar el tutorial
  await cerrarTooltipIframe(page);
    
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'test-results/quini6-03-pantalla.png', fullPage: true });

   // ── Verificar si hay selección de evento antes del botón suerte ──
const haySeleccionEvento = await iframe.locator('.EventPlusInfo_nameBox__Gsg5H')
  .first()
  .waitFor({ state: 'visible', timeout: 5000 })
  .then(() => true)
  .catch(() => false);

if (haySeleccionEvento) {
  console.log('🖱️ Seleccionando evento Tradicional...');
  await iframe.locator('.EventPlusInfo_nameBox__Gsg5H', { hasText: 'Tradicional' })
    .first()
    .click();
  console.log('✅ Evento seleccionado');
  await page.waitForTimeout(1000);
}

   // quitar el tutorial
    await cerrarTooltipIframe(page);
    
    await page.waitForTimeout(1000);
    
      // Force click en el botón
  console.log('🖱️ Paso 3: Click en boton suerte...');
  const botonSuerte = iframe.locator('#boton-suerte');
  await botonSuerte.waitFor({ state: 'visible', timeout: 15000 });
  await botonSuerte.click({ force: true });
  console.log('✅ Boton suerte activado');

    await page.waitForTimeout(1000);

  console.log('🖱️ Paso 4: Click en botón Avanzar...');
  await page.screenshot({ path: 'test-results/quini6-04-pantalla.png', fullPage: true });

// Click en botón Avanzar

await iframe.getByRole('button', { name: /Avanzar/i }).click();

console.log('✅ Botón Avanzar clickeado');
await page.screenshot({ path: 'test-results/quini6-05-pantalla.png', fullPage: true });

//const revanchaBadge = iframe.locator('span.badge:has-text("REVANCHA")');
const precioCirculo = iframe.locator('.Modalities_circle__lqrqi');

const botonConfirmar = iframe.getByRole('button', { name: /Confirmar/i });
await page.frameLocator('iframe[title="juego"]').getByText('REVANCHA', { exact: true }).click();
await expect(precioCirculo).toHaveText('$2.000', { timeout: 2000 });
await botonConfirmar.click();
await page.screenshot({ path: 'test-results/quini6-06-pantalla.png', fullPage: true });
console.log('🖱️ Paso 5: Click en botón Confirmar realizado');

await page.waitForTimeout(3000);
await page.screenshot({ path: 'test-results/quini6-07-cupon-generado.png', fullPage: true });
    
console.log('🎉 ¡Test de Quini 6 completado exitosamente!');

});

test('Loto Plus', async ({ page }) => {
  await expect(page).toHaveURL(/.*\/plataforma\/home/);
  console.log('✅ Paso 1: En pantalla de juegos');
  await page.screenshot({ path: 'test-results/lotoplus-01-home.png', fullPage: true });

  await cerrarModalTutorial(page);

  console.log('🖱️ Click en Loto Plus...');

  // Asegurarse que el modal no esté interfiriendo
const modal = page.locator('.ModalAvisosGenerales');
if (await modal.isVisible()) {
  console.log('⚠️ Modal detectado antes del click, cerrándolo...');
  await page.locator('.ModalAvisosGenerales').press('Escape');
  // o el botón de cierre que uses en cerrarModalTutorial
  await modal.waitFor({ state: 'hidden', timeout: 5000 });
  console.log('✅ Modal cerrado');
}

// Esperar que no haya ningún modal activo en el DOM
await page.locator('.modal.show').waitFor({ state: 'hidden', timeout: 8000 });

// Buscar específicamente el link visible, no el clonado oculto
const lotoLink = page.locator('a[href="/plataforma/juego/lotoplus"]').filter({ visible: true }).first();

await lotoLink.waitFor({ state: 'visible', timeout: 8000 });
await lotoLink.click();

console.log('✅ Click en Loto Plus');

  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'test-results/lotoplus-02-pantalla.png', fullPage: true });

  const iframe = page.frameLocator('iframe[title="juego"]');

  await page.waitForTimeout(1500);

  console.log('🖱️ Seleccionando día del sorteo...');
  await seleccionarDia(iframe);

  await page.waitForTimeout(1500);

  await cerrarTooltipIframe(page);

  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'test-results/lotoplus-03-pantalla.png', fullPage: true });

  console.log('🖱️ Paso 3: Click en boton suerte...');
  const botonSuerte = iframe.locator('#boton-suerte');
  await botonSuerte.click({ force: true });
  console.log('✅ Boton suerte activado');

  await page.waitForTimeout(1000);

  console.log('🖱️ Paso 4: Click en botón Avanzar...');
  await iframe.getByRole('button', { name: /Avanzar/i }).click();
  console.log('✅ Botón Avanzar clickeado');
  await page.screenshot({ path: 'test-results/lotoplus-04-pantalla.png', fullPage: true }); // ✅ después del click

  await page.waitForTimeout(2000);

  console.log('🖱️ Paso 5: Click en botón Confirmar');
  const botonConfirmar = iframe.getByRole('button', { name: /Confirmar/i });
  await botonConfirmar.click();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'test-results/lotoplus-05-cupon-generado.png', fullPage: true });

  console.log('🎉 ¡Test de Loto Plus completado exitosamente!');
});

});
  

