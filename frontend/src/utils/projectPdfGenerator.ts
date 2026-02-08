/**
 * Generate a professional project analysis PDF for Chairperson
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateProjectAnalysisPDF = (
  projects: any[],
  projectFinancials: Record<string, any>
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 20;

  // ====== HEADER ======
  doc.setFillColor(139, 92, 246); // Purple
  doc.rect(0, 0, pageWidth, 35, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Company Project Analysis Report', pageWidth / 2, 18, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 28, { align: 'center' });
  
  yPosition = 50;

  // Calculate totals
  let totalCost = 0;
  let totalRevenue = 0;
  
  projects.forEach(proj => {
    const financials = projectFinancials[proj.id];
    if (financials) {
      totalCost += financials.cost_to_company || 0;
      totalRevenue += financials.revenue || 0;
    }
  });

  const totalProfit = totalRevenue - totalCost;

  // ====== EXECUTIVE SUMMARY ======
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Executive Summary', 15, yPosition);
  yPosition += 8;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const summaryText = `This report provides a comprehensive analysis of all ${projects.length} active projects across the organization. Each project is evaluated based on its strategic objectives, team composition, progress metrics, and financial performance. The total investment across all projects is $${totalCost.toLocaleString()}, with projected revenue of $${totalRevenue.toLocaleString()}, resulting in a net profit of $${totalProfit.toLocaleString()}.`;
  
  const summaryLines = doc.splitTextToSize(summaryText, pageWidth - 30);
  for (const line of summaryLines) {
    if (yPosition > pageHeight - 20) {
      doc.addPage();
      yPosition = 20;
    }
    doc.text(line, 15, yPosition);
    yPosition += 5;
  }
  yPosition += 8;

  // ====== FINANCIAL OVERVIEW ======
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Financial Overview', 15, yPosition);
  yPosition += 8;

  autoTable(doc, {
    startY: yPosition,
    head: [['Metric', 'Amount']],
    body: [
      ['Total Project Investment', `$${totalCost.toLocaleString()}`],
      ['Total Projected Revenue', `$${totalRevenue.toLocaleString()}`],
      ['Net Profit', `$${totalProfit.toLocaleString()}`],
      ['Profit Margin', `${totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0'}%`],
    ],
    theme: 'grid',
    headStyles: { 
      fillColor: [139, 92, 246],
      fontSize: 10,
      fontStyle: 'bold'
    },
    bodyStyles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 100, fontStyle: 'bold' },
      1: { cellWidth: 80, halign: 'right', fontStyle: 'bold' }
    },
    margin: { left: 15, right: 15 }
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  // ====== PROJECT DETAILS ======
  projects.forEach((proj, index) => {
    const financials = projectFinancials[proj.id] || {};
    const projectCost = financials.cost_to_company || 0;
    const projectRevenue = financials.revenue || 0;
    const projectProfit = projectRevenue - projectCost;

    // Check if we need a new page
    if (yPosition > pageHeight - 100) {
      doc.addPage();
      yPosition = 20;
    }

    // Project Number Header
    doc.setFillColor(139, 92, 246);
    doc.rect(15, yPosition - 5, pageWidth - 30, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`${index + 1}. ${proj.name}`, 17, yPosition + 2);
    yPosition += 12;

    doc.setTextColor(0, 0, 0);

    // Project Brief
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Project Overview:', 15, yPosition);
    yPosition += 5;

    doc.setFont('helvetica', 'normal');
    const projectBrief = generateProjectBrief(proj, financials);
    const briefLines = doc.splitTextToSize(projectBrief, pageWidth - 30);
    for (const line of briefLines) {
      if (yPosition > pageHeight - 20) {
        doc.addPage();
        yPosition = 20;
      }
      doc.text(line, 15, yPosition);
      yPosition += 4.5;
    }
    yPosition += 3;

    // Team & Progress
    doc.setFont('helvetica', 'bold');
    doc.text('Team & Progress:', 15, yPosition);
    yPosition += 5;

    doc.setFont('helvetica', 'normal');
    const teamInfo = `Team: ${proj.team} | Progress: ${proj.progress}% | Status: ${proj.status} | Active Tickets: ${proj.active_tickets}${proj.blocked_count > 0 ? ` | Blocked: ${proj.blocked_count}` : ''}`;
    const teamLines = doc.splitTextToSize(teamInfo, pageWidth - 30);
    for (const line of teamLines) {
      if (yPosition > pageHeight - 20) {
        doc.addPage();
        yPosition = 20;
      }
      doc.text(line, 15, yPosition);
      yPosition += 4.5;
    }
    yPosition += 3;

    // Financial Metrics
    doc.setFont('helvetica', 'bold');
    doc.text('Financial Metrics:', 15, yPosition);
    yPosition += 5;

    autoTable(doc, {
      startY: yPosition,
      head: [['Metric', 'Amount']],
      body: [
        ['Project Investment (CTC)', `$${projectCost.toLocaleString()}`],
        ['Projected Revenue', `$${projectRevenue.toLocaleString()}`],
        ['Expected Profit', `$${projectProfit.toLocaleString()}`],
        ['ROI', `${financials.roi || 0}%`],
      ],
      theme: 'striped',
      headStyles: { 
        fillColor: [139, 92, 246],
        fontSize: 8,
        fontStyle: 'bold'
      },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 60, halign: 'right', fontStyle: 'bold' }
      },
      margin: { left: 15, right: 15 }
    });

    yPosition = (doc as any).lastAutoTable.finalY + 10;
  });

  // ====== SUMMARY PAGE ======
  doc.addPage();
  yPosition = 20;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Portfolio Summary', 15, yPosition);
  yPosition += 10;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  
  const insights: string[] = [];
  
  insights.push(`• Total of ${projects.length} projects are currently being managed across the organization.`);
  
  const activeProjects = projects.filter(p => p.status === 'Ongoing').length;
  insights.push(`• ${activeProjects} projects are actively in progress, representing ${((activeProjects / projects.length) * 100).toFixed(0)}% of the portfolio.`);
  
  const blockedProjects = projects.filter(p => p.blocked_count > 0).length;
  if (blockedProjects > 0) {
    insights.push(`• ${blockedProjects} projects have blocked tickets requiring immediate attention to maintain timeline.`);
  }
  
  const avgProgress = projects.reduce((sum, p) => sum + p.progress, 0) / projects.length;
  insights.push(`• Average project completion is ${avgProgress.toFixed(1)}%, indicating ${avgProgress >= 70 ? 'strong' : avgProgress >= 50 ? 'moderate' : 'early-stage'} portfolio maturity.`);
  
  if (totalProfit > 0) {
    insights.push(`• The portfolio is projected to generate a profit of $${totalProfit.toLocaleString()}, demonstrating strong financial health.`);
  } else {
    insights.push(`• Current portfolio shows a deficit of $${Math.abs(totalProfit).toLocaleString()}, requiring cost optimization or revenue enhancement.`);
  }

  const profitMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0';
  insights.push(`• Overall profit margin of ${profitMargin}% indicates ${Number(profitMargin) >= 20 ? 'excellent' : Number(profitMargin) >= 10 ? 'good' : 'moderate'} operational efficiency.`);

  insights.push(`• Strategic focus should be on maintaining high-performing projects while addressing blockers in delayed initiatives.`);

  for (const insight of insights) {
    const lines = doc.splitTextToSize(insight, pageWidth - 30);
    for (const line of lines) {
      if (yPosition > pageHeight - 20) {
        doc.addPage();
        yPosition = 20;
      }
      doc.text(line, 15, yPosition);
      yPosition += 5;
    }
    yPosition += 2;
  }

  // ====== FOOTER ======
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `Page ${i} of ${pageCount} | Confidential - Executive Use Only`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  const fileName = `project-analysis-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
  
  return fileName;
};

/**
 * Generate a 3-line project brief based on project data
 */
function generateProjectBrief(project: any, financials: any): string {
  const briefs: Record<string, string> = {
    // Default briefs based on project characteristics
  };

  // Generate a contextual brief
  const purpose = `This project aims to ${project.status === 'Completed' ? 'deliver' : 'develop'} ${project.name.toLowerCase()} for the ${project.team} team.`;
  
  const scope = `The initiative focuses on ${project.active_tickets > 10 ? 'large-scale' : 'targeted'} development with ${project.active_tickets} active work items${project.blocked_count > 0 ? `, though ${project.blocked_count} blockers require resolution` : ''}.`;
  
  const value = financials.revenue 
    ? `Expected to generate $${(financials.revenue / 1000).toFixed(0)}K in revenue with an ROI of ${financials.roi || 0}%, this project represents a ${financials.roi >= 20 ? 'high-value' : financials.roi >= 0 ? 'profitable' : 'strategic'} investment.`
    : `This strategic initiative supports organizational objectives and operational excellence.`;

  return `${purpose} ${scope} ${value}`;
}
