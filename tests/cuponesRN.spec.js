
import { test, expect } from '@playwright/test';

// Función recursiva para manejar el modal y reintentar
async function seleccionarRioNegrina(iframe, page, maxReintentos = 5) {
  for (let intento = 1; intento <= maxReintentos; intento++) {
    console.log(`Intento ${intento} de seleccionar RIONEGRINA`);
    
    // Paso 3: Seleccionar sorteo RioNegrina
    const rioNegrina = iframe.locator('div.juego:has-text("RIONEGRINA")').first();
    await rioNegrina.waitFor({ state: 'visible', timeout: 5000 });
    await rioNegrina.click();

    // Paso 4: Click en Trébol para billete al azar
    console.log('🖱️ Paso 4: Click en Trébol para billete al azar...');
    const botonSuerte = iframe.locator('button.boton.boton-suerte');
    await botonSuerte.waitFor({ state: 'visible', timeout: 5000 });
    await botonSuerte.click();
    console.log('✅ Botón Trébol clickeado - Billete generado');
    
    await page.waitForTimeout(1000); // ✅ Ahora page está definido
    await page.screenshot({ path: 'test-results/loteria-04-billete-generado.png', fullPage: true });

    // Paso 5: Seleccionar fracción de billete
    console.log('🖱️ Paso 5: Seleccionando fracción de billete...');
    
    const checkmark = iframe.locator('label.container-input:has(#fraccion-1) span.checkmark');
    await checkmark.waitFor({ state: 'visible', timeout: 5000 });
    await checkmark.click();

    console.log('✅ Fracción seleccionada');
      
    // Esperar un momento para que cargue
    await page.waitForTimeout(1000); // ✅ Cambiado de iframe.page()
    
    // Verificar si apareció el modal de error
    try {
      const modal = iframe.locator('#modal-alerta');
      await modal.waitFor({ state: 'visible', timeout: 3000 });
      
      console.log('Modal "Billete no disponible" detectado');
      
      // Hacer click en "Intente nuevamente"
      const botonReintentar = modal.locator('button.btn.btn-primary:has-text("Intente nuevamente")');
      await botonReintentar.click();
      
      console.log('Click en "Intente nuevamente" - reintentando selección...');
      
      // Esperar a que el modal se cierre
      await modal.waitFor({ state: 'hidden', timeout: 2000 });
      
      // Continuar el bucle para volver a intentar
      continue;
      
    } catch (error) {
      // No apareció el modal, significa que la selección fue exitosa
      console.log('Selección de RIONEGRINA exitosa');
      return true;
    }
  }
  
  throw new Error(`No se pudo seleccionar RIONEGRINA después de ${maxReintentos} intentos`);
}

test.describe('Test Lotline La Rionegrina', () => {
  
  test.beforeEach(async ({ page }) => {
    const username = process.env.TEST_RN_USER;
    const password = process.env.TEST_RN_PASSWORD;

    if (!username || !password) {
      test.skip();
      console.log('⚠️ Test saltado: Credenciales no configuradas');
      return;
    }

    // Navegar a la plataforma
    await page.goto('/plataforma/');
    
    console.log('🔐 Iniciando sesión...');
    
    // Hacer login
    await page.locator('#nroDocu').first().fill(username);
    await page.locator('#clave').first().fill(password);
    await page.click('button:has-text("INGRESAR")');
        
    // Esperar navegación a /home
    await page.waitForURL(/.*\/home/, { timeout: 10000 });
    
    console.log('✅ Login exitoso - En pantalla de juegos');
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
  
  const modalHeader = page.locator('#headerModal-13, .modalHeader-13');
  const isModalVisible = await modalHeader.isVisible().catch(() => false);
  
  if (isModalVisible) {
    console.log('⚠️ Modal de Avisos generales detectado, cerrándolo...');
    
    // Click en el botón de cerrar (X)
    const closeButton = page.locator('.modalHeader-13 button.close');
    await closeButton.click();
    
    console.log('✅ Modal cerrado exitosamente');
    
    // Esperar a que el modal desaparezca completamente
    await page.waitForTimeout(1000);
  } else {
    console.log('✅ No hay modal de avisos');
  }
    // Paso 2: Click en botón Quiniela Tradicional
    console.log('🖱️ Paso 2: Buscando botón Quiniela Tradicional...');
    const quinielaButton = page.locator('button:has-text("Quiniela Tradicional"), a:has-text("Quiniela Tradicional"), [class*="row justify-content-center text-center"]').first();
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
    await page.waitForTimeout(2000);
   // await page.screenshot({ path: 'test-results/quiniela-05-seleccion-extracto.png', fullPage: true });
    console.log('✅ Pantalla de selección de extracto abierta');

    // Paso 10: Click en botón Rio Negro
    console.log('🖱️ Paso 10: Seleccionando extracto Rio Negro...');
    const botonRioNegro = iframe.locator('label#btnExtracto:has-text("Rio Negro"), label.extractoButton:has-text("Rio Negro")').first();
    await botonRioNegro.waitFor({ state: 'visible', timeout: 5000 });
    await botonRioNegro.click();
    console.log('✅ Extracto Rio Negro seleccionado');
    
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
  
  const modalHeader = page.locator('#headerModal-13, .modalHeader-13');
  const isModalVisible = await modalHeader.isVisible().catch(() => false);
  
  if (isModalVisible) {
    console.log('⚠️ Modal de Avisos generales detectado, cerrándolo...');
    
    // Click en el botón de cerrar (X)
    const closeButton = page.locator('.modalHeader-13 button.close');
    await closeButton.click();
    
    console.log('✅ Modal cerrado exitosamente');
    
    // Esperar a que el modal desaparezca completamente
    await page.waitForTimeout(1000);
  } else {
    console.log('✅ No hay modal de avisos');
  }
  
  // Click en Patagonia Minibingo
    console.log('🖱️ Paso 2: Click en Patagonia Minibingo...');
    await page.getByRole('link', { name: 'img Patagonia Minibingo' }).click();
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
  
  const modalHeader = page.locator('#headerModal-13, .modalHeader-13');
  const isModalVisible = await modalHeader.isVisible().catch(() => false);
  
  if (isModalVisible) {
    console.log('⚠️ Modal de Avisos generales detectado, cerrándolo...');
    
    // Click en el botón de cerrar (X)
    const closeButton = page.locator('.modalHeader-13 button.close');
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
    
    await page.waitForTimeout(3000);
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
  
  const modalHeader = page.locator('#headerModal-13, .modalHeader-13');
  const isModalVisible = await modalHeader.isVisible().catch(() => false);
  
  if (isModalVisible) {
    console.log('⚠️ Modal de Avisos generales detectado, cerrándolo...');
    
    // Click en el botón de cerrar (X)
    const closeButton = page.locator('.modalHeader-13 button.close');
    await closeButton.click();
    
    console.log('✅ Modal cerrado exitosamente');
    
    // Esperar a que el modal desaparezca completamente
    await page.waitForTimeout(1000);
  } else {
    console.log('✅ No hay modal de avisos');
  }
      // Click en Pozo de la Quiniela
    console.log('🖱️ Paso 2: Click en Pozo de la Quiniela...');
    await page.getByRole('link', { name: 'img Pozo de la Quiniela' }).click();
    console.log('✅ Click en Pozo de la Quiniela ejecutado');
    
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results/pozo-02-pantalla.png', fullPage: true });

    // Trabajar dentro del iframe
    const iframe = page.frameLocator('iframe[title="juego"]');
    
    // Click en primer logoN (primera selección)
    console.log('🖱️ Paso 3: Seleccionando primera opción...');
    await iframe.getByRole('img', { name: 'logoN' }).first().click();
    console.log('✅ Primera opción seleccionada');
    
    await page.waitForTimeout(500);

        console.log('🖱️ Paso 5: Click en trébol de la suerte...');
    await iframe.getByRole('button', { name: 'trebol de la suerte jugar' }).click();
    console.log('✅ Trébol de la suerte activado');
    
    await page.waitForTimeout(1000);

    // Click en botón Jugar!
    console.log('🖱️ Paso 6: Click en botón Jugar!...');
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
  
  const modalHeader = page.locator('#headerModal-13, .modalHeader-13');
  const isModalVisible = await modalHeader.isVisible().catch(() => false);
  
  if (isModalVisible) {
    console.log('⚠️ Modal de Avisos generales detectado, cerrándolo...');
    const closeButton = page.locator('.modalHeader-13 button.close');
    await closeButton.click();
    console.log('✅ Modal cerrado exitosamente');
    await page.waitForTimeout(1000);
  } else {
    console.log('✅ No hay modal de avisos');
  }

  // Paso 2: Click en Lotería Unificada
  console.log('🖱️ Paso 2: Click en Lotería Unificada...');
  await page.locator('a[href*="loteria"]')
    .filter({ hasText: 'Lotería Unificada' })
    .first()
    .click();
  console.log('✅ Click en Lotería Unificada ejecutado');
  
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'test-results/loteria-02-pantalla-inicial.png', fullPage: true });

  // Trabajar dentro del iframe
  const iframe = page.frameLocator('iframe[title="juego"]');

  await seleccionarRioNegrina(iframe, page);
  
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
});


  

