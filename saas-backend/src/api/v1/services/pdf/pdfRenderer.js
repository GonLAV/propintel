'use strict';

/**
 * Renders an HTML string to a PDF buffer via headless Chromium (Playwright).
 *
 * Why Playwright over a "draw the PDF directly" library (pdfkit, jsPDF):
 * Hebrew is RTL and needs correct bidi (mixing Hebrew text with Latin/numeric
 * runs, punctuation, currency symbols). Chromium's layout engine already
 * implements the Unicode bidi algorithm and `dir="rtl"` correctly; PDF-drawing
 * libraries generally do not and tend to reverse/garble mixed-direction text.
 * Rendering real HTML/CSS also means the template is easy to read and change.
 *
 * The browser is launched lazily and reused across calls (launching Chromium
 * per-request is the dominant cost of PDF generation). Call closeBrowser()
 * on process shutdown to release it cleanly.
 */

const logger = require('../../../../config/logger');

let browserPromise = null;

function launchBrowser() {
  // eslint-disable-next-line global-require
  const { chromium } = require('playwright');
  const launchOpts = { headless: true };
  // Optional override for environments where the bundled/downloaded Chromium
  // isn't used (e.g. an Alpine image using the system `chromium` package).
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) {
    launchOpts.executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  }
  // Some container runtimes (e.g. without CAP_SYS_ADMIN) can't use Chromium's
  // sandbox. Opt-in only — never default this on, it weakens the sandbox.
  if (process.env.PLAYWRIGHT_CHROMIUM_NO_SANDBOX === '1') {
    launchOpts.args = ['--no-sandbox', '--disable-setuid-sandbox'];
  }
  return chromium.launch(launchOpts);
}

async function getBrowser() {
  if (!browserPromise) {
    browserPromise = launchBrowser().catch((err) => {
      browserPromise = null; // allow retry on next call
      throw err;
    });
  }
  return browserPromise;
}

/**
 * @param {string} html - full HTML document to render
 * @param {object} [opts] - Playwright page.pdf() overrides (e.g. headerTemplate/footerTemplate)
 * @returns {Promise<Buffer>}
 */
async function renderHtmlToPdf(html, opts = {}) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: 'networkidle' });
    const hasHeaderFooter = Boolean(opts.headerTemplate || opts.footerTemplate);
    const buffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: hasHeaderFooter,
      margin: hasHeaderFooter
        ? { top: '22mm', bottom: '18mm', left: '14mm', right: '14mm' }
        : { top: '14mm', bottom: '14mm', left: '14mm', right: '14mm' },
      ...opts,
    });
    return buffer;
  } finally {
    await page.close().catch((err) => logger.warn({ err }, 'pdf page close failed'));
  }
}

async function closeBrowser() {
  if (!browserPromise) return;
  try {
    const browser = await browserPromise;
    await browser.close();
  } catch (err) {
    logger.warn({ err }, 'pdf browser close failed');
  } finally {
    browserPromise = null;
  }
}

module.exports = { renderHtmlToPdf, closeBrowser };
