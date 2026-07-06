import { jsPDF } from 'jspdf';

export interface NozzleDetail {
  nozzle: {
    id: string;
    nozzleNumber: string;
    fuelType: string;
  };
  openingReading: number;
  closingReading: number;
  testingLiters: number;
  soldLiters: number;
  cash: number;
  upi: number;
  card: number;
  creditSales: number;
  clientNames: string;
  totalCollected: number;
  expectedAmount: number;
  variance: number;
  rate: number;
}

export interface DayReconciliation {
  date: string;
  recordsCount: number;
  shiftsList: string;
  nozzleDetails: NozzleDetail[];
  totalSoldLiters: number;
  totalExpectedAmount: number;
  totalCash: number;
  totalUpi: number;
  totalCard: number;
  totalCredit: number;
  totalCollected: number;
  totalVariance: number;
}

export interface ConsolidatedPDFData {
  startDate: string;
  endDate: string;
  lang: 'en' | 'gu';
  cumulativeLiters: number;
  cumulativeExpected: number;
  cumulativeCollected: number;
  cumulativeVariance: number;
  dailyReconciliations: DayReconciliation[];
}

/**
 * Format a number to Indian Rupee (INR) format for the PDF
 */
function formatRupee(amount: number): string {
  return 'Rs. ' + amount.toLocaleString('en-IN', {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1
  });
}

/**
 * Helper to draw page header on new pages
 */
function drawPageHeader(doc: jsPDF, title: string, pageNumber: number) {
  doc.setFillColor(15, 23, 42); // slate-900 background
  doc.rect(15, 12, 180, 16, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(title.toUpperCase(), 20, 22.5);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(200, 200, 200);
  doc.text(`Page ${pageNumber}`, 185, 22);
  
  // Thin border around the page
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.2);
}

/**
 * Helper to draw footer on pages
 */
function drawPageFooter(doc: jsPDF, y: number) {
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(15, y, 195, y);
  
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('Generated via Fuel Station Audit Pro - Cloud Administration Panel', 15, y + 4.5);
  doc.text(new Date().toLocaleString(), 195, y + 4.5, { align: 'right' });
}

export function downloadConsolidatedPDF(data: ConsolidatedPDFData): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const { startDate, endDate, lang, cumulativeLiters, cumulativeExpected, cumulativeCollected, cumulativeVariance, dailyReconciliations } = data;
  let pageNumber = 1;
  
  // 1. Title Banner
  doc.setFillColor(13, 148, 136); // Teal-600 banner
  doc.rect(15, 15, 180, 22, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text('24-HOUR RECONCILIATION AUDIT REPORT', 22, 24);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(204, 251, 241); // Teal-100
  doc.text(`PERIOD: ${startDate} to ${endDate}  |  GENERATED: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 22, 30.5);

  // 2. Info Grid Section
  doc.setFillColor(248, 250, 252); // slate-50
  doc.rect(15, 41, 180, 20, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.rect(15, 41, 180, 20, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105); // slate-600
  
  doc.text('System State:', 20, 48);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text('Consolidated 24-Hour Shifts (Verified)', 43, 48);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Target Scope:', 20, 54);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(`${dailyReconciliations.length} days of data compiled`, 43, 54);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Report Language:', 125, 48);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(lang === 'en' ? 'English (EN)' : 'Gujarati (GU)', 155, 48);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Document Security:', 125, 54);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text('Administrator Copy Only', 155, 54);

  // 3. Overall Summary Widgets Panel
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('OVERALL CONSOLIDATED SUMMARY', 15, 69.5);

  // Four grid widgets
  const widgetWidth = 42.5;
  const widgetGap = 3.3;
  const startX = 15;
  const yWidget = 73;
  const widgetHeight = 22;

  // Draw 4 rectangles
  for (let i = 0; i < 4; i++) {
    const x = startX + i * (widgetWidth + widgetGap);
    doc.setFillColor(241, 245, 249); // slate-100
    doc.rect(x, yWidget, widgetWidth, widgetHeight, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(x, yWidget, widgetWidth, widgetHeight, 'S');
  }

  // Widget 1: Cumulative Fuel Volume
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text('TOTAL VOLUME SOLD', startX + 3, yWidget + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(13, 148, 136); // Teal-600
  doc.text(`${cumulativeLiters.toFixed(1)} L`, startX + 3, yWidget + 14);

  // Widget 2: Cumulative Expected
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('EXPECTED REVENUE', startX + widgetWidth + widgetGap + 3, yWidget + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(formatRupee(cumulativeExpected), startX + widgetWidth + widgetGap + 3, yWidget + 14);

  // Widget 3: Cumulative Collected
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL COLLECTED', startX + 2 * (widgetWidth + widgetGap) + 3, yWidget + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(16, 185, 129); // emerald-500
  doc.text(formatRupee(cumulativeCollected), startX + 2 * (widgetWidth + widgetGap) + 3, yWidget + 14);

  // Widget 4: Overall Variance
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL VARIANCE', startX + 3 * (widgetWidth + widgetGap) + 3, yWidget + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  
  if (cumulativeVariance >= 0) {
    doc.setTextColor(16, 185, 129); // positive green
    doc.text(`+${formatRupee(cumulativeVariance)}`, startX + 3 * (widgetWidth + widgetGap) + 3, yWidget + 14);
  } else {
    doc.setTextColor(225, 29, 72); // negative rose
    doc.text(formatRupee(cumulativeVariance), startX + 3 * (widgetWidth + widgetGap) + 3, yWidget + 14);
  }

  // 4. Daily Reconciliations List
  let y = 104;

  dailyReconciliations.forEach((dayRecon, index) => {
    // If drawing this entire day might overflow, start a new page
    // Estimate page requirement: day header (12mm) + table header (8mm) + rows (6mm each) + totals row (8mm)
    const requiredHeight = 12 + 8 + (dayRecon.nozzleDetails.length * 6) + 8 + 10;
    
    if (y + requiredHeight > 275) {
      drawPageFooter(doc, 283);
      doc.addPage();
      pageNumber++;
      y = 35; // Start at y=35 on new pages, leaving space for page header
      drawPageHeader(doc, `24-HOUR RECONCILIATION AUDIT REPORT (${startDate} to ${endDate})`, pageNumber);
    } else {
      // Draw horizontal separating line before day if it's not the first one
      if (index > 0) {
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.4);
        doc.line(15, y - 4, 195, y - 4);
      }
    }

    // Day Header
    doc.setFillColor(241, 245, 249); // light background for day title
    doc.rect(15, y, 180, 8.5, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.2);
    doc.rect(15, y, 180, 8.5, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    const dateFormatted = new Date(dayRecon.date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    doc.text(dateFormatted.toUpperCase(), 19, y + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Shifts Consolidated: ${dayRecon.shiftsList}  (${dayRecon.recordsCount} shifts)`, 115, y + 5.5);

    y += 12;

    // Table Header
    doc.setFillColor(71, 85, 105); // slate-600 header
    doc.rect(15, y, 180, 6.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    
    doc.text('NOZZLE', 17, y + 4.5);
    doc.text('OPENING', 42, y + 4.5, { align: 'right' });
    doc.text('CLOSING', 62, y + 4.5, { align: 'right' });
    doc.text('TEST L', 76, y + 4.5, { align: 'right' });
    doc.text('SOLD L', 91, y + 4.5, { align: 'right' });
    doc.text('RATE', 103, y + 4.5, { align: 'right' });
    doc.text('EXPECTED', 123, y + 4.5, { align: 'right' });
    doc.text('COLLECTED (CASH/UPI/CR)', 158, y + 4.5, { align: 'right' });
    doc.text('TOTAL COL', 178, y + 4.5, { align: 'right' });
    doc.text('DIFF', 192, y + 4.5, { align: 'right' });

    y += 6.5;

    // Table Rows
    dayRecon.nozzleDetails.forEach((noz, nozIdx) => {
      // Row Background alternating
      if (nozIdx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(15, y, 180, 5.5, 'F');
      }

      // Separator line
      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.15);
      doc.line(15, y + 5.5, 195, y + 5.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(30, 41, 59); // slate-800
      
      const nozNum = noz.nozzle.nozzleNumber;
      const cleanNozName = nozNum.toLowerCase().startsWith('nozzle') ? nozNum : `Nozzle ${nozNum}`;
      doc.text(`${cleanNozName} (${noz.nozzle.fuelType.toUpperCase()})`, 17, y + 3.8);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.text(noz.openingReading.toFixed(2), 42, y + 3.8, { align: 'right' });
      doc.text(noz.closingReading.toFixed(2), 62, y + 3.8, { align: 'right' });
      doc.text(noz.testingLiters > 0 ? `${noz.testingLiters.toFixed(1)} L` : '-', 76, y + 3.8, { align: 'right' });
      
      doc.setFont('helvetica', 'bold');
      doc.text(`${noz.soldLiters.toFixed(1)} L`, 91, y + 3.8, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.text(`Rs. ${noz.rate.toFixed(1)}`, 103, y + 3.8, { align: 'right' });
      
      doc.text(noz.expectedAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 }), 123, y + 3.8, { align: 'right' });

      // Collected Breakdown
      const creditLabel = noz.creditSales > 0 ? `+Cr:${Math.round(noz.creditSales)}` : '';
      const breakdownText = `${Math.round(noz.cash)}/${Math.round(noz.upi)}${creditLabel ? ' ' + creditLabel : ''}`;
      doc.setFontSize(5.5);
      doc.setTextColor(100, 116, 139);
      doc.text(breakdownText, 158, y + 3.8, { align: 'right' });

      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(noz.totalCollected.toLocaleString('en-IN', { maximumFractionDigits: 0 }), 178, y + 3.8, { align: 'right' });

      // Diff
      if (Math.abs(noz.variance) < 2) {
        doc.setTextColor(16, 185, 129);
        doc.text('0', 192, y + 3.8, { align: 'right' });
      } else if (noz.variance > 0) {
        doc.setTextColor(14, 116, 144); // light blue/cyan
        doc.text(`+${Math.round(noz.variance)}`, 192, y + 3.8, { align: 'right' });
      } else {
        doc.setTextColor(225, 29, 72);
        doc.text(`${Math.round(noz.variance)}`, 192, y + 3.8, { align: 'right' });
      }

      y += 5.5;
    });

    // Totals Row for Day
    doc.setFillColor(241, 245, 249);
    doc.rect(15, y, 180, 6.5, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.2);
    doc.line(15, y, 195, y);
    doc.line(15, y + 6.5, 195, y + 6.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    doc.text('DAILY CONSOLIDATED TOTAL', 17, y + 4.5);
    doc.text(`${dayRecon.totalSoldLiters.toFixed(1)} L`, 91, y + 4.5, { align: 'right' });
    doc.text(dayRecon.totalExpectedAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 }), 123, y + 4.5, { align: 'right' });
    doc.text(dayRecon.totalCollected.toLocaleString('en-IN', { maximumFractionDigits: 0 }), 178, y + 4.5, { align: 'right' });

    if (Math.abs(dayRecon.totalVariance) < 2) {
      doc.setTextColor(16, 185, 129);
      doc.text('0', 192, y + 4.5, { align: 'right' });
    } else if (dayRecon.totalVariance > 0) {
      doc.setTextColor(14, 116, 144);
      doc.text(`+${Math.round(dayRecon.totalVariance)}`, 192, y + 4.5, { align: 'right' });
    } else {
      doc.setTextColor(225, 29, 72);
      doc.text(`${Math.round(dayRecon.totalVariance)}`, 192, y + 4.5, { align: 'right' });
    }

    y += 12; // Gap before next section
  });

  // Draw final footer on the last page
  drawPageFooter(doc, 283);

  // Save Document
  doc.save(`Consolidated_24H_Reconciliation_${startDate}_to_${endDate}.pdf`);
}

export function downloadDailyPDF(dateStr: string, dayRecon: DayReconciliation, lang: 'en' | 'gu'): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Title block
  doc.setFillColor(15, 118, 110); // Teal dark-600
  doc.rect(15, 15, 180, 22, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text('24-HOUR DAILY AUDIT SHEET', 22, 24);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(204, 251, 241);
  const formattedDate = new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  doc.text(`DATE: ${formattedDate.toUpperCase()}  |  CONSOLIDATED SHIFTS: ${dayRecon.shiftsList}`, 22, 30.5);

  // Stats Grid Section
  doc.setFillColor(248, 250, 252);
  doc.rect(15, 42, 180, 18, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.rect(15, 42, 180, 18, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL VOL SOLD', 20, 48);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`${dayRecon.totalSoldLiters.toFixed(1)} Liters`, 20, 55);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('EXPECTED REVENUE', 70, 48);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(formatRupee(dayRecon.totalExpectedAmount), 70, 55);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL COLLECTED', 120, 48);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(16, 185, 129);
  doc.text(formatRupee(dayRecon.totalCollected), 120, 55);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('VARIANCE', 165, 48);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  if (dayRecon.totalVariance >= 0) {
    doc.setTextColor(16, 185, 129);
    doc.text(`+${formatRupee(dayRecon.totalVariance)}`, 165, 55);
  } else {
    doc.setTextColor(225, 29, 72);
    doc.text(formatRupee(dayRecon.totalVariance), 165, 55);
  }

  // Table header
  let y = 68;
  doc.setFillColor(51, 65, 85); // slate-700
  doc.rect(15, y, 180, 7.5, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  
  doc.text('NOZZLE', 17, y + 5);
  doc.text('OPENING', 42, y + 5, { align: 'right' });
  doc.text('CLOSING', 62, y + 5, { align: 'right' });
  doc.text('TEST L', 76, y + 5, { align: 'right' });
  doc.text('SOLD L', 91, y + 5, { align: 'right' });
  doc.text('RATE', 103, y + 5, { align: 'right' });
  doc.text('EXPECTED', 123, y + 5, { align: 'right' });
  doc.text('COLLECTED (CASH/UPI/CR)', 158, y + 5, { align: 'right' });
  doc.text('TOTAL COL', 178, y + 5, { align: 'right' });
  doc.text('DIFF', 192, y + 5, { align: 'right' });

  y += 7.5;

  // Table rows
  dayRecon.nozzleDetails.forEach((noz, nozIdx) => {
    // Alternating rows
    if (nozIdx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(15, y, 180, 6, 'F');
    }

    // Border line
    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.2);
    doc.line(15, y + 6, 195, y + 6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(30, 41, 59);
    
    const nozNum = noz.nozzle.nozzleNumber;
    const cleanNozName = nozNum.toLowerCase().startsWith('nozzle') ? nozNum : `Nozzle ${nozNum}`;
    doc.text(`${cleanNozName} (${noz.nozzle.fuelType.toUpperCase()})`, 17, y + 4.2);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text(noz.openingReading.toFixed(2), 42, y + 4.2, { align: 'right' });
    doc.text(noz.closingReading.toFixed(2), 62, y + 4.2, { align: 'right' });
    doc.text(noz.testingLiters > 0 ? `${noz.testingLiters.toFixed(1)} L` : '-', 76, y + 4.2, { align: 'right' });
    
    doc.setFont('helvetica', 'bold');
    doc.text(`${noz.soldLiters.toFixed(1)} L`, 91, y + 4.2, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.text(`Rs. ${noz.rate.toFixed(1)}`, 103, y + 4.2, { align: 'right' });
    
    doc.text(noz.expectedAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 }), 123, y + 4.2, { align: 'right' });

    // Collected breakdown
    const creditLabel = noz.creditSales > 0 ? `+Cr:${Math.round(noz.creditSales)}` : '';
    const breakdownText = `${Math.round(noz.cash)}/${Math.round(noz.upi)}${creditLabel ? ' ' + creditLabel : ''}`;
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text(breakdownText, 158, y + 4.2, { align: 'right' });

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(noz.totalCollected.toLocaleString('en-IN', { maximumFractionDigits: 0 }), 178, y + 4.2, { align: 'right' });

    // Nozzle variance
    if (Math.abs(noz.variance) < 2) {
      doc.setTextColor(16, 185, 129);
      doc.text('0', 192, y + 4.2, { align: 'right' });
    } else if (noz.variance > 0) {
      doc.setTextColor(14, 116, 144);
      doc.text(`+${Math.round(noz.variance)}`, 192, y + 4.2, { align: 'right' });
    } else {
      doc.setTextColor(225, 29, 72);
      doc.text(`${Math.round(noz.variance)}`, 192, y + 4.2, { align: 'right' });
    }

    y += 6;
  });

  // Totals Row
  doc.setFillColor(241, 245, 249);
  doc.rect(15, y, 180, 8, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.line(15, y, 195, y);
  doc.line(15, y + 8, 195, y + 8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('TOTAL CONSOLIDATED FOR THE DAY', 17, y + 5.2);
  doc.text(`${dayRecon.totalSoldLiters.toFixed(1)} L`, 91, y + 5.2, { align: 'right' });
  doc.text(dayRecon.totalExpectedAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 }), 123, y + 5.2, { align: 'right' });
  doc.text(dayRecon.totalCollected.toLocaleString('en-IN', { maximumFractionDigits: 0 }), 178, y + 5.2, { align: 'right' });

  if (Math.abs(dayRecon.totalVariance) < 2) {
    doc.setTextColor(16, 185, 129);
    doc.text('0', 192, y + 5.2, { align: 'right' });
  } else if (dayRecon.totalVariance > 0) {
    doc.setTextColor(14, 116, 144);
    doc.text(`+${Math.round(dayRecon.totalVariance)}`, 192, y + 5.2, { align: 'right' });
  } else {
    doc.setTextColor(225, 29, 72);
    doc.text(`${Math.round(dayRecon.totalVariance)}`, 192, y + 5.2, { align: 'right' });
  }

  // Draw footer
  drawPageFooter(doc, 280);

  // Save Document
  doc.save(`Daily_Reconciliation_${dateStr}.pdf`);
}
