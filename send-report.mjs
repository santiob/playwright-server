import { execSync } from 'child_process';
import { Resend } from 'resend';
import fs from 'fs';
import path from 'path';

const resend = new Resend(process.env.RESEND_API_KEY);

const reportPath = path.resolve('./playwright-report/index.html');
const xmlPath = path.resolve('./test-results/results.xml');
const reportDir = path.resolve('./playwright-report');

// Leer el reporte HTML
const htmlReport = fs.existsSync(reportPath)
  ? fs.readFileSync(reportPath, 'utf-8')
  : '<p>No se generó reporte HTML.</p>';

// Parsear resultados básicos del XML
let summary = 'Sin datos';
let failedTests = '';
let passedSuites = '';

if (fs.existsSync(xmlPath)) {
  const xml = fs.readFileSync(xmlPath, 'utf-8');
  const tests    = (xml.match(/tests="(\d+)"/)   || [])[1] || '?';
  const failures = (xml.match(/failures="(\d+)"/) || [])[1] || '?';
  const skipped  = (xml.match(/skipped="(\d+)"/)  || [])[1] || '?';
  const passed   = parseInt(tests) - parseInt(failures) - parseInt(skipped);
  summary = `Total: ${tests} | ✅ Pasaron: ${passed} | ❌ Fallaron: ${failures} | ⏭️ Saltados: ${skipped}`;

  // --- Detectar suites y sus fallos ---
  const suiteRegex = /<testsuite[^>]+name="([^"]+)"[^>]*failures="(\d+)"[^>]*(?:tests="(\d+)")?[^>]*>/g;
  const suiteFailMap = {}; // { suiteName: failureCount }
  let suiteMatch;

  while ((suiteMatch = suiteRegex.exec(xml)) !== null) {
    const suiteName = suiteMatch[1];
    const suiteFailures = parseInt(suiteMatch[2]) || 0;
    suiteFailMap[suiteName] = suiteFailures;
  }

  // Suites sin fallos → leyenda OK
  const okSuites = Object.entries(suiteFailMap)
    .filter(([, fails]) => fails === 0)
    .map(([name]) => name);

  if (okSuites.length > 0) {
    const okRows = okSuites.map(name => `
      <tr>
        <td style="padding: 10px 14px; border: 1px solid #c3e6cb; color: #155724; font-size: 14px;">
          ✅ Todos los Test Lotline de <strong>${name}</strong> OK
        </td>
      </tr>
    `).join('');

    passedSuites = `
      <h3 style="color: #155724;">✅ Suites sin fallos</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <tbody style="background: #d4edda;">
          ${okRows}
        </tbody>
      </table>
    `;
  }

  // --- Informe de tests fallidos (igual que antes) ---
  if (parseInt(failures) > 0) {
    const testCaseRegex = /<testcase[^>]+name="([^"]+)"[^>]*>[\s\S]*?<failure[^>]*message="([^"]*)"[^>]*>/g;
    let match;
    const failedList = [];

    while ((match = testCaseRegex.exec(xml)) !== null) {
      const testName = match[1];
      const message = match[2]
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
      failedList.push(`
        <tr>
          <td style="padding: 8px; border: 1px solid #f5c6cb; color: #721c24; font-size: 12px;">${message}</td>
        </tr>
      `);
    }

    if (failedList.length > 0) {
      failedTests = `
        <h3 style="color: #721c24;">❌ Tests Fallidos</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background: #f8d7da;">
              <th style="padding: 8px; border: 1px solid #f5c6cb; text-align: left;">Error</th>
            </tr>
          </thead>
          <tbody>
            ${failedList.join('')}
          </tbody>
        </table>
      `;
    }
  }
}

const fecha = new Date().toLocaleDateString('es-AR', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
});

// Comprimir solo playwright-report (sin videos ni screenshots)
const zipPath = path.resolve('./playwright-report.zip');
if (fs.existsSync(reportDir)) {
  // Excluir archivos pesados
  execSync(`zip -r ${zipPath} ./playwright-report -x "*.webm" -x "*.mp4" -x "*.png"`);
}

const attachments = [];
if (fs.existsSync(zipPath)) {
  const zipSize = fs.statSync(zipPath).size;
  console.log(`📦 Tamaño del zip: ${(zipSize / 1024 / 1024).toFixed(2)} MB`);
  
  if (zipSize < 35 * 1024 * 1024) {
    attachments.push({
      filename: 'playwright-report.zip',
      content: fs.readFileSync(zipPath).toString('base64'),
      encoding: 'base64',
    });
  } else {
    console.log('⚠️ Zip demasiado grande, se enviará sin adjunto');
  }
}

const response = await resend.emails.send({
  from: 'Playwright <ci@tecnoaccion.com.ar>',
  to: ['sobregon@tecnoaccion.com.ar', 'gmilich@tecnoaccion.com.ar', 'cocampos@tecnoaccion.com.ar', 'fernando.perez@tecnoaccion.com.ar', 'ffigueroa@tecnoaccion.com.ar', 'hbraun@tecnoaccion.com.ar', 'csaissac@tecnoaccion.com.ar', 'hamartinez@tecnoaccion.com.ar'],
  subject: `🎭 Playwright Report — ${fecha}`,
  html: `
    <h2>Lotline Reporte de Tests Playwright</h2>
    <p><strong>Fecha:</strong> ${fecha}</p>
    <p><strong>Resumen:</strong> ${summary}</p>
    ${passedSuites}
    ${failedTests}
    <hr/>
    <p>📎 El reporte completo se encuentra adjunto en <strong>playwright-report.zip</strong></p>
  `,
  attachments,
});

console.log('📧 Respuesta de Resend:', JSON.stringify(response, null, 2));

if (response.error) {
  console.error('❌ Error al enviar:', response.error);
} else {
  console.log('✅ Reporte enviado por email. ID:', response.data?.id);
}

