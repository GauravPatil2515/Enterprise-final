/**
 * PDF Report Generator for Company Intelligence Reports
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface CompanySummary {
  total_teams: number;
  total_members: number;
  total_projects: number;
  total_active_tickets: number;
  total_done_tickets: number;
  total_blocked: number;
  avg_progress: number;
  completion_rate: number;
  overloaded_members: number;
  idle_members: number;
}

export const generateCompanyReportPDF = (
  reportText: string,
  summary: CompanySummary,
  timestamp: string
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 20;

  // ====== HEADER ======
  doc.setFillColor(99, 102, 241); // Primary color
  doc.rect(0, 0, pageWidth, 35, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Enterprise Intelligence Report', pageWidth / 2, 18, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date(timestamp).toLocaleString()}`, pageWidth / 2, 28, { align: 'center' });
  
  yPosition = 45;

  // ====== EXECUTIVE SUMMARY ======
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Executive Summary', 15, yPosition);
  yPosition += 8;

  // Summary metrics table
  autoTable(doc, {
    startY: yPosition,
    head: [['Metric', 'Value', 'Status']],
    body: [
      ['Total Teams', summary.total_teams.toString(), '📊'],
      ['Total Members', summary.total_members.toString(), '👥'],
      ['Total Projects', summary.total_projects.toString(), '📁'],
      ['Active Tickets', summary.total_active_tickets.toString(), '🎯'],
      ['Completed Tickets', summary.total_done_tickets.toString(), '✅'],
      ['Blocked Items', summary.total_blocked.toString(), summary.total_blocked > 0 ? '⚠️' : '✓'],
      ['Avg Progress', `${Math.round(summary.avg_progress)}%`, summary.avg_progress >= 70 ? '✓' : '⚠️'],
      ['Completion Rate', `${Math.round(summary.completion_rate)}%`, summary.completion_rate >= 80 ? '✓' : '⚠️'],
      ['Overloaded Members', summary.overloaded_members.toString(), summary.overloaded_members > 0 ? '⚠️' : '✓'],
      ['Idle Members', summary.idle_members.toString(), summary.idle_members > 0 ? '⚠️' : '✓'],
    ],
    theme: 'grid',
    headStyles: { 
      fillColor: [99, 102, 241],
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: 'bold'
    },
    bodyStyles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 70, fontStyle: 'bold' },
      1: { cellWidth: 70, halign: 'center' },
      2: { cellWidth: 30, halign: 'center', fontSize: 12 }
    },
    margin: { left: 15, right: 15 }
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  // ====== AI ANALYSIS REPORT ======
  // Check if we need a new page
  if (yPosition > pageHeight - 60) {
    doc.addPage();
    yPosition = 20;
  }

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('AI-Generated Analysis', 15, yPosition);
  yPosition += 8;

  // Split the report text into paragraphs
  const paragraphs = reportText.split('\n\n');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  for (const paragraph of paragraphs) {
    // Check if section header (starts with #)
    if (paragraph.trim().startsWith('#')) {
      const headerText = paragraph.replace(/#+\s*/g, '').trim();
      
      // Add space before header
      if (yPosition > pageHeight - 40) {
        doc.addPage();
        yPosition = 20;
      }
      
      yPosition += 5;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(99, 102, 241);
      doc.text(headerText, 15, yPosition);
      doc.setTextColor(0, 0, 0);
      yPosition += 7;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      continue;
    }

    // Regular paragraph
    const lines = doc.splitTextToSize(paragraph.trim(), pageWidth - 30);
    
    for (const line of lines) {
      if (yPosition > pageHeight - 20) {
        doc.addPage();
        yPosition = 20;
      }
      
      doc.text(line, 15, yPosition);
      yPosition += 5;
    }
    
    yPosition += 3; // Space between paragraphs
  }

  // ====== FOOTER ======
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `Page ${i} of ${pageCount} | Enterprise Decision Intelligence Platform`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  // Save the PDF
  const fileName = `enterprise-report-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
  
  return fileName;
};

/**
 * Generate a comprehensive financial summary PDF with explanatory text
 */
export const generateFinancialSummaryPDF = (
  teams: any[],
  costAnalysis: any[],
  totalCTC: number,
  totalRevenue: number,
  totalProfit: number
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 20;

  // ====== HEADER ======
  doc.setFillColor(245, 158, 11); // Amber
  doc.rect(0, 0, pageWidth, 35, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('Financial Summary Report', pageWidth / 2, 18, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 28, { align: 'center' });
  
  yPosition = 50;

  // ====== EXECUTIVE SUMMARY ======
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Executive Summary', 15, yPosition);
  yPosition += 10;

  // Add explanatory text
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const roi = totalCTC > 0 ? ((totalProfit / totalCTC) * 100).toFixed(1) : '0';
  const roiStatus = Number(roi) >= 0 ? 'positive' : 'negative';
  
  const summaryText = `This financial report provides a comprehensive overview of the organization's economic performance across ${teams.length} teams. The analysis includes cost-to-company (CTC) metrics, revenue generation, profitability, and return on investment (ROI) calculations. The current ROI of ${roi}% indicates a ${roiStatus} return, with total revenue of $${totalRevenue.toLocaleString()} against operational costs of $${totalCTC.toLocaleString()}.`;
  
  const summaryLines = doc.splitTextToSize(summaryText, pageWidth - 30);
  for (const line of summaryLines) {
    if (yPosition > pageHeight - 20) {
      doc.addPage();
      yPosition = 20;
    }
    doc.text(line, 15, yPosition);
    yPosition += 5;
  }
  yPosition += 10;

  // Check for page break
  if (yPosition > pageHeight - 100) {
    doc.addPage();
    yPosition = 20;
  }

  // ====== OVERALL METRICS ======
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Company Financial Overview', 15, yPosition);
  yPosition += 10;

  autoTable(doc, {
    startY: yPosition,
    head: [['Metric', 'Amount', 'Interpretation']],
    body: [
      [
        'Total Cost to Company (Monthly)',
        `$${totalCTC.toLocaleString()}`,
        'Total operational expenses including salaries, benefits, and overhead'
      ],
      [
        'Total Revenue',
        `$${totalRevenue.toLocaleString()}`,
        'Aggregate revenue generated across all teams and projects'
      ],
      [
        'Net Profit',
        `$${totalProfit.toLocaleString()}`,
        totalProfit >= 0 ? 'Positive profit margin indicates healthy operations' : 'Negative margin requires cost optimization'
      ],
      [
        'Return on Investment (ROI)',
        `${roi}%`,
        Number(roi) >= 20 ? 'Excellent ROI' : Number(roi) >= 10 ? 'Good ROI' : Number(roi) >= 0 ? 'Moderate ROI' : 'Needs improvement'
      ],
    ],
    theme: 'grid',
    headStyles: { 
      fillColor: [245, 158, 11],
      fontSize: 9,
      fontStyle: 'bold',
      textColor: [255, 255, 255]
    },
    bodyStyles: { 
      fontSize: 8,
      cellPadding: 3
    },
    columnStyles: {
      0: { cellWidth: 55, fontStyle: 'bold' },
      1: { cellWidth: 35, halign: 'right', fontStyle: 'bold' },
      2: { cellWidth: 90, fontSize: 7 }
    },
    margin: { left: 15, right: 15 }
  });

  yPosition = (doc as any).lastAutoTable.finalY + 20;

  // ====== TEAM BREAKDOWN ======
  if (yPosition > pageHeight - 100) {
    doc.addPage();
    yPosition = 20;
  }

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Team Financial Breakdown', 15, yPosition);
  yPosition += 8;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const teamText = `The following table breaks down financial performance by team. Each team's contribution to overall revenue and profitability is analyzed, along with per-member efficiency metrics. Teams with higher ROI percentages demonstrate better resource utilization and value generation.`;
  const teamLines = doc.splitTextToSize(teamText, pageWidth - 30);
  for (const line of teamLines) {
    if (yPosition > pageHeight - 20) {
      doc.addPage();
      yPosition = 20;
    }
    doc.text(line, 15, yPosition);
    yPosition += 5;
  }
  yPosition += 8;

  autoTable(doc, {
    startY: yPosition,
    head: [['Team', 'Members', 'CTC/mo', 'Revenue', 'Profit', 'ROI', 'Performance']],
    body: teams.map(team => {
      const teamROI = team.roi || 0;
      const performance = teamROI >= 20 ? 'Excellent' : teamROI >= 10 ? 'Good' : teamROI >= 0 ? 'Fair' : 'Poor';
      return [
        team.name?.replace(' Team', '') || 'Unknown',
        team.member_count || 0,
        `$${((team.cost_to_company || 0) / 1000).toFixed(0)}K`,
        `$${((team.revenue || 0) / 1000).toFixed(0)}K`,
        `$${((team.profit || 0) / 1000).toFixed(0)}K`,
        `${teamROI}%`,
        performance
      ];
    }),
    theme: 'striped',
    headStyles: { 
      fillColor: [245, 158, 11],
      fontSize: 8,
      fontStyle: 'bold',
      textColor: [255, 255, 255]
    },
    bodyStyles: { 
      fontSize: 8,
      cellPadding: 2
    },
    columnStyles: {
      1: { halign: 'center' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right', fontStyle: 'bold' },
      6: { halign: 'center', fontSize: 7 }
    },
    margin: { left: 15, right: 15 }
  });

  yPosition = (doc as any).lastAutoTable.finalY + 20;

  // ====== PROJECT ANALYSIS ======
  if (costAnalysis && costAnalysis.length > 0) {
    if (yPosition > pageHeight - 100) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Project Financial Analysis', 15, yPosition);
    yPosition += 8;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const projectText = `This section analyzes individual project economics, including cost allocation, revenue attribution, and risk exposure. Projects with blocked tickets represent potential revenue delays and require immediate attention. The ROI metric helps prioritize resource allocation to high-performing initiatives.`;
    const projectLines = doc.splitTextToSize(projectText, pageWidth - 30);
    for (const line of projectLines) {
      if (yPosition > pageHeight - 20) {
        doc.addPage();
        yPosition = 20;
      }
      doc.text(line, 15, yPosition);
      yPosition += 5;
    }
    yPosition += 8;

    // Top 10 projects by ROI
    const topProjects = [...costAnalysis]
      .sort((a, b) => (b.roi || 0) - (a.roi || 0))
      .slice(0, 10);

    autoTable(doc, {
      startY: yPosition,
      head: [['Project', 'Team', 'CTC', 'Revenue', 'ROI', 'Risk']],
      body: topProjects.map(proj => {
        const riskLevel = proj.blocked_count > 1 ? 'HIGH' : proj.blocked_count === 1 ? 'MED' : 'LOW';
        return [
          (proj.project_name || '').slice(0, 25),
          (proj.team || '').slice(0, 15),
          `$${((proj.cost_to_company || 0) / 1000).toFixed(0)}K`,
          `$${((proj.revenue || 0) / 1000).toFixed(0)}K`,
          `${proj.roi || 0}%`,
          riskLevel
        ];
      }),
      theme: 'grid',
      headStyles: { 
        fillColor: [245, 158, 11],
        fontSize: 8,
        fontStyle: 'bold',
        textColor: [255, 255, 255]
      },
      bodyStyles: { 
        fontSize: 7,
        cellPadding: 2
      },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 35 },
        2: { halign: 'right', cellWidth: 25 },
        3: { halign: 'right', cellWidth: 25 },
        4: { halign: 'right', fontStyle: 'bold', cellWidth: 20 },
        5: { halign: 'center', cellWidth: 15 }
      },
      margin: { left: 15, right: 15 }
    });

    yPosition = (doc as any).lastAutoTable.finalY + 20;
  }

  // ====== KEY INSIGHTS ======
  if (yPosition > pageHeight - 80) {
    doc.addPage();
    yPosition = 20;
  }

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Key Financial Insights', 15, yPosition);
  yPosition += 10;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  // Generate insights
  const insights: string[] = [];
  
  if (Number(roi) >= 20) {
    insights.push('• Excellent overall ROI indicates strong financial health and efficient resource utilization.');
  } else if (Number(roi) >= 0) {
    insights.push('• Positive ROI is maintained, but there is room for optimization to improve profitability.');
  } else {
    insights.push('• Negative ROI requires immediate attention. Consider cost reduction or revenue enhancement strategies.');
  }

  const profitableTeams = teams.filter(t => (t.roi || 0) >= 10).length;
  if (profitableTeams > teams.length / 2) {
    insights.push(`• ${profitableTeams} out of ${teams.length} teams demonstrate strong ROI (>=10%), indicating effective team management.`);
  } else {
    insights.push(`• Only ${profitableTeams} out of ${teams.length} teams achieve ROI >=10%. Consider performance improvement initiatives.`);
  }

  const avgTeamROI = teams.reduce((sum, t) => sum + (t.roi || 0), 0) / teams.length;
  insights.push(`• Average team ROI is ${avgTeamROI.toFixed(1)}%, which serves as a benchmark for team performance evaluation.`);

  if (totalProfit > 0) {
    const profitMargin = ((totalProfit / totalRevenue) * 100).toFixed(1);
    insights.push(`• Profit margin of ${profitMargin}% indicates ${Number(profitMargin) >= 20 ? 'healthy' : 'moderate'} operational efficiency.`);
  }

  insights.push('• Regular monitoring of these metrics enables data-driven decision making and strategic resource allocation.');

  for (const insight of insights) {
    const lines = doc.splitTextToSize(insight, pageWidth - 30);
    for (const line of lines) {
      if (yPosition > pageHeight - 20) {
        doc.addPage();
        yPosition = 20;
      }
      doc.text(line, 15, yPosition);
      yPosition += 6;
    }
    yPosition += 3;
  }

  // ====== FOOTER ======
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `Page ${i} of ${pageCount} | Enterprise Financial Intelligence | Confidential`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  const fileName = `financial-summary-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
  
  return fileName;
};
