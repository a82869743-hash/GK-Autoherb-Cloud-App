const pool = require('../config/db');
const path = require('path');
const fs = require('fs');

// ─── Number-to-Words Converter (Indian format) ───────────────
const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function numberToWords(num) {
  if (num === 0) return 'Zero Rupees';
  num = Math.round(num);
  if (num < 0) return 'Minus ' + numberToWords(-num);

  let result = '';

  if (Math.floor(num / 10000000) > 0) {
    result += numberToWords(Math.floor(num / 10000000)) + ' Crore ';
    num %= 10000000;
  }
  if (Math.floor(num / 100000) > 0) {
    result += numberToWords(Math.floor(num / 100000)) + ' Lakh ';
    num %= 100000;
  }
  if (Math.floor(num / 1000) > 0) {
    result += numberToWords(Math.floor(num / 1000)) + ' Thousand ';
    num %= 1000;
  }
  if (Math.floor(num / 100) > 0) {
    result += ONES[Math.floor(num / 100)] + ' Hundred ';
    num %= 100;
  }
  if (num > 0) {
    if (result !== '') result += 'and ';
    if (num < 20) {
      result += ONES[num];
    } else {
      result += TENS[Math.floor(num / 10)];
      if (num % 10 > 0) result += ' ' + ONES[num % 10];
    }
  }
  return result.trim();
}

function amountInWords(amount) {
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  let words = numberToWords(rupees) + ' Rupees';
  if (paise > 0) words += ' and ' + numberToWords(paise) + ' Paise';
  return words;
}

// ─── Format currency Indian style ────────────────────────────
function formatINR(num) {
  const n = parseFloat(num) || 0;
  return n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// ─── Load logo as base64 ────────────────────────────────────
function getLogoBase64() {
  try {
    const logoPath = path.join(__dirname, '..', 'assets', 'gk_logo.png');
    if (fs.existsSync(logoPath)) {
      const data = fs.readFileSync(logoPath);
      return `data:image/png;base64,${data.toString('base64')}`;
    }
  } catch (e) { /* silent */ }
  return null;
}

/**
 * Generate "Bill of Supply" PDF matching exact GK AutoHerb template
 */
async function generateInvoicePDF(jobCartId) {
  const conn = await pool.getConnection();
  try {
    // 1. Fetch job cart with vehicle + customer
    const [carts] = await conn.query(`
      SELECT jc.*, v.registration_no, v.brand, v.model, v.customer_id,
             u.name AS customer_name, u.mobile AS customer_mobile, u.email AS customer_email
      FROM job_carts jc
      JOIN vehicles v ON jc.vehicle_id = v.id
      JOIN users u ON v.customer_id = u.id
      WHERE jc.id = ?
    `, [jobCartId]);

    if (!carts.length) throw new Error('Job cart not found');
    const cart = carts[0];

    // 2. Fetch services with products cost
    const [services] = await conn.query(`
      SELECT js.*, 
        COALESCE(SUM(jp.quantity * jp.unit_cost), 0) AS products_cost
      FROM job_services js
      LEFT JOIN job_products jp ON js.id = jp.job_service_id
      WHERE js.job_cart_id = ?
      GROUP BY js.id
      ORDER BY js.id
    `, [jobCartId]);

    // 3. Fetch settings
    const [settingsRows] = await conn.query('SELECT key_name, value FROM settings');
    const settings = {};
    settingsRows.forEach(r => { settings[r.key_name] = r.value; });

    // 4. Invoice number
    let invoiceNumber = cart.invoice_number;
    if (!invoiceNumber) {
      const prefix = settings.invoice_prefix || 'GK';
      invoiceNumber = `${prefix}-DRAFT`;
    }

    // 5. Calculate totals
    let totalQty = 0;
    let grandTotal = 0;
    const serviceRows = services.map((s) => {
      const servicePrice = parseFloat(s.service_price) || 0;
      const laborCharges = parseFloat(s.labor_charges) || 0;
      const productsTotal = parseFloat(s.products_cost) || 0;
      const amount = servicePrice + laborCharges + productsTotal;
      totalQty += 1;
      grandTotal += amount;

      return {
        name: (s.service_name || '').toUpperCase(),
        qty: '1 PCS',
        rate: formatINR(amount),
        amount: formatINR(amount),
      };
    });

    // 5b. Compute Discount & Final Total
    let discountAmt = 0;
    if (cart.discount_type === 'percentage') {
      discountAmt = grandTotal * (parseFloat(cart.discount_value || 0) / 100);
    } else if (cart.discount_type === 'fixed') {
      discountAmt = parseFloat(cart.discount_value || 0);
    }
    const finalTotal = Math.max(0, grandTotal - discountAmt);

    // 6. Format date
    const invoiceDate = cart.completed_at
      ? new Date(cart.completed_at).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : cart.visit_date
        ? new Date(cart.visit_date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });

    // 7. Logo
    const logoBase64 = getLogoBase64();
    const logoHtml = logoBase64
      ? `<img src="${logoBase64}" alt="GK Auto Herb" style="width:80px;height:80px;object-fit:contain;" />`
      : `<div style="width:80px;height:80px;background:#D32F2F;border-radius:8px;display:flex;align-items:center;justify-content:center;color:white;font-weight:900;font-size:14px;text-align:center;">Auto<br>Herb</div>`;

    // 8. Service rows HTML
    const serviceRowsHtml = serviceRows.map((s) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e0e0e0;font-size:12px;text-transform:uppercase;">${s.name}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e0e0e0;font-size:12px;text-align:center;">${s.qty}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e0e0e0;font-size:12px;text-align:right;">${s.rate}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e0e0e0;font-size:12px;text-align:right;">${s.amount}</td>
      </tr>
    `).join('');

    // Pad with empty rows to fill space
    const emptyRowsCount = Math.max(0, 6 - serviceRows.length);
    const emptyRows = Array(emptyRowsCount).fill(`
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e0e0e0;">&nbsp;</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e0e0e0;">&nbsp;</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e0e0e0;">&nbsp;</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e0e0e0;">&nbsp;</td>
      </tr>
    `).join('');

    // 9. Build HTML matching exact template
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <style>
        @page { size: A4; margin: 0; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Segoe UI', Arial, Helvetica, sans-serif;
          color: #1a1a1a;
          padding: 30px 35px;
          font-size: 12px;
          line-height: 1.4;
        }

        .bill-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
        }
        .bill-title {
          font-size: 13px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .original-badge {
          display: inline-block;
          border: 1px solid #999;
          padding: 2px 8px;
          font-size: 9px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-left: 8px;
          color: #666;
        }

        .company-header {
          display: flex;
          align-items: center;
          gap: 15px;
          background: #D32F2F;
          padding: 12px 15px;
          border-radius: 4px;
          margin-bottom: 15px;
          margin-top: 8px;
        }
        .company-logo {
          flex-shrink: 0;
          background: white;
          padding: 4px;
          border-radius: 4px;
        }
        .company-info {
          color: white;
        }
        .company-info h1 {
          font-size: 22px;
          font-weight: 800;
          margin-bottom: 3px;
        }
        .company-info p {
          font-size: 10px;
          line-height: 1.5;
          opacity: 0.95;
        }
        .company-info .gst-row {
          margin-top: 4px;
          font-size: 10px;
          font-weight: 600;
        }

        .invoice-meta {
          display: flex;
          border: 1px solid #D32F2F;
          margin-bottom: 12px;
        }
        .invoice-meta-left, .invoice-meta-right {
          flex: 1;
          padding: 8px 12px;
        }
        .invoice-meta-right {
          text-align: right;
          border-left: 1px solid #D32F2F;
        }
        .meta-label {
          font-size: 10px;
          color: #D32F2F;
          font-weight: 700;
        }
        .meta-value {
          font-size: 13px;
          font-weight: 700;
        }

        .bill-details {
          display: flex;
          border: 1px solid #D32F2F;
          border-top: none;
          margin-top: -12px;
          margin-bottom: 15px;
        }
        .bill-to-section {
          flex: 1;
          padding: 10px 12px;
        }
        .vehicle-section {
          flex: 0 0 220px;
          padding: 10px 12px;
          border-left: 1px solid #D32F2F;
          text-align: right;
        }
        .bill-to-label, .vehicle-label {
          font-size: 10px;
          font-weight: 700;
          color: #D32F2F;
          text-transform: uppercase;
        }
        .bill-to-name {
          font-size: 13px;
          font-weight: 700;
          margin-top: 3px;
        }
        .bill-to-detail {
          font-size: 11px;
          color: #444;
          margin-top: 1px;
        }
        .vehicle-value {
          font-size: 12px;
          font-weight: 600;
          margin-top: 2px;
        }

        /* ─── Services Table ─── */
        .services-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 0;
        }
        .services-table thead th {
          background: #D32F2F;
          color: white;
          padding: 8px 12px;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          text-align: left;
        }
        .services-table thead th:nth-child(2),
        .services-table thead th:nth-child(3),
        .services-table thead th:nth-child(4) {
          text-align: center;
        }
        .services-table thead th:last-child {
          text-align: right;
        }

        /* ─── Subtotal ─── */
        .subtotal-row {
          display: flex;
          justify-content: space-between;
          padding: 10px 12px;
          border: 1px solid #D32F2F;
          font-weight: 700;
          font-size: 13px;
          margin-top: 20px;
          margin-bottom: 0;
        }

        /* ─── Bottom Section ─── */
        .bottom-grid {
          display: flex;
          gap: 0;
          border: 1px solid #D32F2F;
          border-top: none;
        }
        .bank-section {
          flex: 1;
          padding: 12px;
          border-right: 1px solid #D32F2F;
        }
        .amounts-section {
          flex: 0 0 260px;
          padding: 0;
        }
        .bank-title {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          margin-bottom: 6px;
        }
        .bank-row {
          display: flex;
          font-size: 10px;
          margin-bottom: 2px;
        }
        .bank-label {
          width: 85px;
          font-weight: 600;
        }
        .bank-value {
          flex: 1;
        }

        .amount-row {
          display: flex;
          justify-content: space-between;
          padding: 6px 12px;
          font-size: 11px;
          border-bottom: 1px solid #eee;
        }
        .amount-row.total {
          background: #D32F2F;
          color: white;
          font-weight: 700;
          font-size: 13px;
        }
        .amount-label { font-weight: 600; }
        .amount-value { font-weight: 700; }

        /* ─── Terms ─── */
        .terms-section {
          border: 1px solid #D32F2F;
          border-top: none;
          display: flex;
        }
        .terms-left {
          flex: 1;
          padding: 12px;
          border-right: 1px solid #D32F2F;
        }
        .terms-right {
          flex: 0 0 260px;
          padding: 12px;
        }
        .terms-title {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          margin-bottom: 6px;
        }
        .terms-text {
          font-size: 9px;
          color: #444;
          line-height: 1.5;
        }
        .words-label {
          font-size: 10px;
          font-weight: 700;
          margin-bottom: 4px;
        }
        .words-value {
          font-size: 11px;
          font-style: italic;
          color: #333;
        }

        /* ─── Signatory ─── */
        .signatory {
          border: 1px solid #D32F2F;
          border-top: none;
          padding: 20px 12px 12px;
          text-align: right;
        }
        .signatory-line {
          width: 200px;
          margin-left: auto;
          text-align: center;
        }
        .signatory-label {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          color: #D32F2F;
        }
        .signatory-name {
          font-size: 11px;
          font-weight: 600;
          margin-top: 2px;
        }
      </style>
    </head>
    <body>

      <!-- ═══ BILL HEADER ═══ -->
      <div class="bill-header">
        <div>
          <span class="bill-title">BILL OF SUPPLY</span>
          <span class="original-badge">ORIGINAL FOR RECIPIENT</span>
        </div>
      </div>

      <!-- ═══ COMPANY HEADER ═══ -->
      <div class="company-header">
        <div class="company-logo">
          ${logoHtml}
        </div>
        <div class="company-info">
          <h1>GK Auto Herb</h1>
          <p>4 Tilak Nagar Society, Near Radiyatba Nagar, Opp AP Mart super store, New alkapuri, Laxmipura,<br>
             Vadodara, Gujarat, 390021</p>
          <div class="gst-row">
            <span>Mobile: 9408424541</span>&nbsp;&nbsp;&nbsp;
            <span>GSTIN: 24AKUPK0446L1ZT</span>&nbsp;&nbsp;&nbsp;
            <span>PAN Number: AKUPK0446L</span>
          </div>
          <p>Email: gaurav.itm2006@gmail.com</p>
        </div>
      </div>

      <!-- ═══ INVOICE META ═══ -->
      <div class="invoice-meta">
        <div class="invoice-meta-left">
          <span class="meta-label">Invoice No.: </span>
          <span class="meta-value">${invoiceNumber}</span>
        </div>
        <div class="invoice-meta-right">
          <span class="meta-label">Invoice Date: </span>
          <span class="meta-value">${invoiceDate}</span>
        </div>
      </div>

      <!-- ═══ BILL TO + VEHICLE ═══ -->
      <div class="bill-details">
        <div class="bill-to-section">
          <div class="bill-to-label">BILL TO</div>
          <div class="bill-to-name">${cart.customer_name || '—'}</div>
          <div class="bill-to-detail">Mobile: ${cart.customer_mobile || '—'}</div>
          <div class="bill-to-detail">Place of Supply: Gujarat</div>
        </div>
        <div class="vehicle-section">
          <div>
            <span class="vehicle-label">Vehicle Name</span>
            <div class="vehicle-value">${(cart.brand || '')} ${(cart.model || '').toUpperCase()}</div>
          </div>
          <div style="margin-top:8px;">
            <span class="vehicle-label">Vehicle No.</span>
            <div class="vehicle-value">${cart.registration_no || '—'}</div>
          </div>
        </div>
      </div>

      <!-- ═══ SERVICES TABLE ═══ -->
      <table class="services-table">
        <thead>
          <tr>
            <th style="width:50%;">SERVICES</th>
            <th style="width:15%;text-align:center;">QTY.</th>
            <th style="width:17%;text-align:right;">RATE</th>
            <th style="width:18%;text-align:right;">AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          ${serviceRowsHtml}
          ${emptyRows}
        </tbody>
      </table>

      <!-- ═══ SUBTOTAL ═══ -->
      <div class="subtotal-row">
        <div><span style="font-size:11px;font-weight:700;">SUBTOTAL</span></div>
        <div style="display:flex;gap:40px;">
          <span>${totalQty}</span>
          <span>₹ ${formatINR(grandTotal)}</span>
        </div>
      </div>

      <!-- ═══ BANK + AMOUNTS ═══ -->
      <div class="bottom-grid">
        <div class="bank-section">
          <div class="bank-title">BANK DETAILS</div>
          <div class="bank-row"><span class="bank-label">Name:</span><span class="bank-value">GK Auto Herb</span></div>
          <div class="bank-row"><span class="bank-label">IFSC Code:</span><span class="bank-value">UTIB0005059</span></div>
          <div class="bank-row"><span class="bank-label">Account No:</span><span class="bank-value">924020045334712</span></div>
          <div class="bank-row"><span class="bank-label">Bank:</span><span class="bank-value">Axis Bank, GOTRI SEVASI ROAD</span></div>
        </div>
        <div class="amounts-section">
          <div class="amount-row">
            <span class="amount-label">Subtotal</span>
            <span class="amount-value">₹ ${formatINR(grandTotal)}</span>
          </div>
          ${discountAmt > 0 ? `
          <div class="amount-row" style="color:#D32F2F;">
            <span class="amount-label">Discount</span>
            <span class="amount-value">- ₹ ${formatINR(discountAmt)}</span>
          </div>
          ` : ''}
          <div class="amount-row total">
            <span class="amount-label">Total Payable</span>
            <span class="amount-value">₹ ${formatINR(finalTotal)}</span>
          </div>
          <div class="amount-row">
            <span class="amount-label">Received Amount</span>
            <span class="amount-value">₹ ${formatINR(finalTotal)}</span>
          </div>
          <div class="amount-row">
            <span class="amount-label">Balance</span>
            <span class="amount-value">₹ 0</span>
          </div>
        </div>
      </div>

      <!-- ═══ TERMS + AMOUNT IN WORDS ═══ -->
      <div class="terms-section">
        <div class="terms-left">
          ${cart.invoice_notes ? `
          <div class="terms-title">NOTES</div>
          <div class="terms-text" style="margin-bottom:8px;">${cart.invoice_notes}</div>
          ` : ''}
          <div class="terms-title">TERMS AND CONDITIONS</div>
          <div class="terms-text">
            1. Your car belongings are not our responsibility and make sure you check your belongings before dropping your car at our workshop.<br>
            2. Please check if any cash or others important documents are there.<br>
            3. All disputes are subject to [Vadodara] jurisdiction only.
          </div>
        </div>
        <div class="terms-right">
          <div class="words-label">Total Amount (in words)</div>
          <div class="words-value">${amountInWords(finalTotal)}</div>
        </div>
      </div>

      <!-- ═══ AUTHORISED SIGNATORY ═══ -->
      <div class="signatory">
        <div class="signatory-line">
          <div style="border-top:1px solid #999;padding-top:6px;margin-top:30px;">
            <div class="signatory-label">AUTHORISED SIGNATORY FOR</div>
            <div class="signatory-name">GK Auto Herb</div>
          </div>
        </div>
      </div>

    </body>
    </html>
    `;

    // 10. Render PDF with Puppeteer
    const puppeteer = require('puppeteer');
    const launchOptions = {
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    };
    // Use system Chromium on VPS (set PUPPETEER_EXECUTABLE_PATH in .env)
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    }
    const browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '8mm', right: '8mm', bottom: '8mm', left: '8mm' },
    });
    await browser.close();

    return { pdfBuffer, invoiceNumber };
  } finally {
    conn.release();
  }
}

module.exports = { generateInvoicePDF };
