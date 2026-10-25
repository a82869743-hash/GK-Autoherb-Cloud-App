const pool = require('../config/db');

exports.getReport = async (req, res) => {
  try {
    const { month, year, format } = req.query;
    const currentMonth = month ? parseInt(month) : new Date().getMonth() + 1;
    const currentYear = year ? parseInt(year) : new Date().getFullYear();

    const [records] = await pool.query(
      `SELECT r.*,
              jc.invoice_number as job_invoice,
              p.invoice_number as purchase_invoice,
              v.name as vendor_name,
              u.name as customer_name
       FROM v2_gst_records r
       LEFT JOIN job_carts jc ON r.invoice_id = jc.id
       LEFT JOIN v2_purchases p ON r.purchase_id = p.id
       LEFT JOIN vendors v ON p.vendor_id = v.id
       LEFT JOIN vehicles veh ON jc.vehicle_id = veh.id
       LEFT JOIN users u ON veh.customer_id = u.id
       WHERE r.period_month = ? AND r.period_year = ?
       ORDER BY r.created_at DESC`,
      [currentMonth, currentYear]
    );

    // Aggregate totals
    let totalTaxableSales = 0;
    let totalGstSales = 0;
    let totalTaxablePurchases = 0;
    let totalGstPurchases = 0;

    records.forEach(r => {
      const taxable = parseFloat(r.taxable_amount || 0);
      const gst = parseFloat(r.total_gst || 0);
      if (r.record_type === 'sales') {
        totalTaxableSales += taxable;
        totalGstSales += gst;
      } else {
        totalTaxablePurchases += taxable;
        totalGstPurchases += gst;
      }
    });

    if (format === 'csv') {
      let csv = 'Type,Invoice/Ref,Party,GSTIN,Taxable Amount (INR),CGST (INR),SGST (INR),IGST (INR),Total GST (INR),Month,Year,Created At\n';
      records.forEach(r => {
        const invNo = r.record_type === 'sales' ? (r.job_invoice || `Ref #${r.id}`) : (r.purchase_invoice || `Ref #${r.id}`);
        const party = r.record_type === 'sales' ? (r.customer_name || 'Counter Customer') : (r.vendor_name || 'Supplier');
        csv += `"${r.record_type.toUpperCase()}","${invNo}","${party}","${r.gstin || ''}",${r.taxable_amount},${r.cgst},${r.sgst},${r.igst},${r.total_gst},${r.period_month},${r.period_year},"${new Date(r.created_at).toLocaleDateString('en-IN')}"\n`;
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=GST_Report_${currentMonth}_${currentYear}.csv`);
      return res.send(csv);
    }

    if (format === 'xlsx') {
      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'GK AutoHerb';

      // 1. GSTR-1 (Sales)
      const gstr1 = workbook.addWorksheet('GSTR-1 Outward Sales');
      gstr1.columns = [
        { header: 'Invoice Number', key: 'invoice_no', width: 22 },
        { header: 'Customer Name', key: 'customer', width: 25 },
        { header: 'GSTIN', key: 'gstin', width: 20 },
        { header: 'Taxable Value (₹)', key: 'taxable', width: 18 },
        { header: 'CGST (₹)', key: 'cgst', width: 14 },
        { header: 'SGST (₹)', key: 'sgst', width: 14 },
        { header: 'IGST (₹)', key: 'igst', width: 14 },
        { header: 'Total GST (₹)', key: 'total_gst', width: 16 },
        { header: 'Date', key: 'date', width: 16 },
      ];
      gstr1.getRow(1).font = { bold: true };

      const salesRecords = records.filter(r => r.record_type === 'sales');
      salesRecords.forEach(r => {
        gstr1.addRow({
          invoice_no: r.job_invoice || `Ref #${r.id}`,
          customer: r.customer_name || 'Counter Customer',
          gstin: r.gstin || 'B2C Retail',
          taxable: parseFloat(r.taxable_amount || 0),
          cgst: parseFloat(r.cgst || 0),
          sgst: parseFloat(r.sgst || 0),
          igst: parseFloat(r.igst || 0),
          total_gst: parseFloat(r.total_gst || 0),
          date: new Date(r.created_at).toLocaleDateString('en-IN')
        });
      });

      // 2. GSTR-2 (Purchases)
      const gstr2 = workbook.addWorksheet('GSTR-2 Inward Purchases');
      gstr2.columns = [
        { header: 'Purchase Invoice', key: 'invoice_no', width: 22 },
        { header: 'Vendor / Supplier', key: 'vendor', width: 25 },
        { header: 'Vendor GSTIN', key: 'gstin', width: 20 },
        { header: 'Taxable Value (₹)', key: 'taxable', width: 18 },
        { header: 'CGST (₹)', key: 'cgst', width: 14 },
        { header: 'SGST (₹)', key: 'sgst', width: 14 },
        { header: 'IGST (₹)', key: 'igst', width: 14 },
        { header: 'Total ITC Claim (₹)', key: 'total_gst', width: 18 },
        { header: 'Date', key: 'date', width: 16 },
      ];
      gstr2.getRow(1).font = { bold: true };

      const purchaseRecords = records.filter(r => r.record_type === 'purchase');
      purchaseRecords.forEach(r => {
        gstr2.addRow({
          invoice_no: r.purchase_invoice || `Ref #${r.id}`,
          vendor: r.vendor_name || 'Vendor',
          gstin: r.gstin || 'Unregistered',
          taxable: parseFloat(r.taxable_amount || 0),
          cgst: parseFloat(r.cgst || 0),
          sgst: parseFloat(r.sgst || 0),
          igst: parseFloat(r.igst || 0),
          total_gst: parseFloat(r.total_gst || 0),
          date: new Date(r.created_at).toLocaleDateString('en-IN')
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=GST_Compliance_Report_${currentMonth}_${currentYear}.xlsx`);
      return res.send(Buffer.from(buffer));
    }

    res.json({
      success: true,
      data: {
        period: { month: currentMonth, year: currentYear },
        summary: {
          sales: { taxable: totalTaxableSales, gst: totalGstSales, total: totalTaxableSales + totalGstSales },
          purchases: { taxable: totalTaxablePurchases, gst: totalGstPurchases, total: totalTaxablePurchases + totalGstPurchases },
          net_gst_payable: totalGstSales - totalGstPurchases
        },
        records
      }
    });
  } catch (err) {
    console.error('GST Report error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};
