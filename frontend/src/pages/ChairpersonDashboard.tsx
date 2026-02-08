/**
 * ChairpersonDashboard — Enhanced Risk overview, AI agent opinions, and decision authority.
 * Improved UI with professional project cards and PDF export functionality.
 */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  AlertTriangle,
  TrendingUp,
  ArrowUpRight,
  Activity,
  Eye,
  XCircle,
  Loader2,
  Clock,
  Download,
  DollarSign,
  BarChart3,
  CheckCircle,
  Zap,
  FileText,
} from 'lucide-react';
import { api, type DashboardData, type AnalysisResult } from '@/services/api';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import NarrativeCard from '@/components/NarrativeCard';
import ReactMarkdown from 'react-markdown';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { generateCompanyReportPDF } from '@/utils/pdfGenerator';
import { generateProjectAnalysisPDF } from '@/utils/projectPdfGenerator';

const riskColors: Record<string, string> = {
  HIGH: 'text-red-400 bg-red-500/20',
  MEDIUM: 'text-amber-400 bg-amber-500/20',
  LOW: 'text-green-400 bg-green-500/20',
};

const ChairpersonDashboard = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [analyses, setAnalyses] = useState<Record<string, { result: AnalysisResult; timestamp: number }>>({});
  const [loading, setLoading] = useState(true);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [analyzingAll, setAnalyzingAll] = useState(false);
  const [companyReport, setCompanyReport] = useState<any>(null);
  const [generatedReport, setGeneratedReport] = useState<string | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportTimestamp, setReportTimestamp] = useState<string | null>(null);
  const [financeData, setFinanceData] = useState<any>(null);

  useEffect(() => {
    // Fetch chairperson, company report, and finance data in parallel
    Promise.all([
      api.getDashboardData('chairperson'),
      api.getCompanyReport(),
      api.getDashboardData('finance')
    ])
      .then(([chairData, companyData, finData]) => {
        setData(chairData);
        setCompanyReport(companyData);
        setFinanceData(finData);
      })
      .catch((err) => {
        import('sonner').then(({ toast }) => toast.error(err?.message || 'Failed to load dashboard'));
      })
      .finally(() => setLoading(false));
  }, []);

  const projects = data?.projects || [];
  const blockedProjects = projects.filter((p: any) => p.blocked_count > 0);
  const activeProjects = projects.filter((p: any) => p.status === 'Ongoing');
  
  // Create lookup map for project financials
  const projectFinancials = financeData?.cost_analysis?.reduce((acc: any, proj: any) => {
    acc[proj.project_id] = proj;
    return acc;
  }, {}) || {};

  const handleAnalyze = async (projectId: string) => {
    setAnalyzingId(projectId);
    try {
      const result = await api.analyzeProject(projectId);
      setAnalyses((prev) => ({ ...prev, [projectId]: { result, timestamp: Date.now() } }));
    } catch (err: any) {
      import('sonner').then(({ toast }) => toast.error(err?.message || 'Risk analysis failed'));
    } finally {
      setAnalyzingId(null);
    }
  };

  const handleAnalyzeAll = async () => {
    setAnalyzingAll(true);
    try {
      for (const proj of projects) {
        setAnalyzingId(proj.id);
        try {
          const result = await api.analyzeProject(proj.id);
          setAnalyses((prev) => ({ ...prev, [proj.id]: { result, timestamp: Date.now() } }));
        } catch {
          // continue analyzing remaining
        }
      }
    } finally {
      setAnalyzingId(null);
      setAnalyzingAll(false);
    }
  };

  const handleGenerateCompanyReport = async () => {
    setGeneratingReport(true);
    try {
      const result = await api.generateCompanyReport();
      setGeneratedReport(result.report);
      setReportTimestamp(result.generated_at);
      import('sonner').then(({ toast }) => toast.success('Company report generated successfully'));
    } catch (err: any) {
      import('sonner').then(({ toast }) => toast.error(err?.message || 'Failed to generate company report'));
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleDownloadCompanyPDF = () => {
    if (!generatedReport || !companyReport?.summary || !reportTimestamp) {
      import('sonner').then(({ toast }) => toast.error('Please generate a report first'));
      return;
    }
    
    try {
      const fileName = generateCompanyReportPDF(
        generatedReport,
        companyReport.summary,
        reportTimestamp
      );
      import('sonner').then(({ toast }) => toast.success(`PDF downloaded: ${fileName}`));
    } catch (err: any) {
      import('sonner').then(({ toast }) => toast.error('Failed to generate PDF'));
    }
  };

  const handleDownloadProjectAnalysisPDF = () => {
    try {
      const fileName = generateProjectAnalysisPDF(projects, projectFinancials);
      import('sonner').then(({ toast }) => toast.success(`Project analysis PDF downloaded: ${fileName}`));
    } catch (err: any) {
      import('sonner').then(({ toast }) => toast.error('Failed to generate project analysis PDF'));
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0 },
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 skeleton rounded-xl" />
          ))}
        </div>
        <div className="h-48 skeleton rounded-xl" />
        <div className="h-64 skeleton rounded-xl" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 skeleton rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 p-2.5 text-white shadow">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Executive Dashboard</h1>
            <p className="text-sm text-muted-foreground">Strategic oversight and decision intelligence</p>
          </div>
        </div>
      </motion.div>

      {(
        <>
          {/* Stats */}
          <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Projects', value: projects.length, icon: <TrendingUp className="h-4 w-4" />, color: 'bg-blue-500/10 text-blue-400' },
              { label: 'Active', value: activeProjects.length, icon: <Activity className="h-4 w-4" />, color: 'bg-green-500/10 text-green-400' },
              { label: 'With Blockers', value: blockedProjects.length, icon: <AlertTriangle className="h-4 w-4" />, color: 'bg-red-500/10 text-red-400' },
              { label: 'On Hold', value: projects.filter((p: any) => p.status === 'On Hold').length, icon: <Eye className="h-4 w-4" />, color: 'bg-amber-500/10 text-amber-400' },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border bg-card p-5 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <span className={cn('flex h-9 w-9 items-center justify-center rounded-lg', stat.color)}>
                    {stat.icon}
                  </span>
                </div>
                <p className="text-xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </motion.div>

          {/* AI Narrative */}
          <motion.div variants={itemVariants}>
            <NarrativeCard role="chairperson" />
          </motion.div>

          {/* Company Report Section */}
          <motion.div variants={itemVariants} className="rounded-xl border bg-card p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-lg font-semibold">Enterprise Intelligence Report</h2>
                <p className="text-sm text-muted-foreground">AI-powered comprehensive company analysis</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleGenerateCompanyReport}
                  disabled={generatingReport}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-purple-700 text-white hover:from-purple-600 hover:to-purple-800 transition-all disabled:opacity-50 text-sm font-medium"
                >
                  {generatingReport ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</>
                  ) : (
                    <><Zap className="h-4 w-4" /> Generate Full Report</>
                  )}
                </button>
                
                {generatedReport && (
                  <button
                    onClick={handleDownloadCompanyPDF}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-primary text-primary hover:bg-primary/10 transition-all text-sm font-medium"
                  >
                    <Download className="h-4 w-4" />
                    Download PDF
                  </button>
                )}
              </div>
            </div>

            {/* Company Summary Stats */}
            {companyReport?.summary && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="rounded-lg border bg-muted/50 p-3">
                  <div className="text-xs text-muted-foreground mb-1">Teams</div>
                  <div className="text-2xl font-bold">{companyReport.summary.total_teams}</div>
                </div>
                <div className="rounded-lg border bg-muted/50 p-3">
                  <div className="text-xs text-muted-foreground mb-1">Workforce</div>
                  <div className="text-2xl font-bold">{companyReport.summary.total_members}</div>
                </div>
                <div className="rounded-lg border bg-muted/50 p-3">
                  <div className="text-xs text-muted-foreground mb-1">Projects</div>
                  <div className="text-2xl font-bold">{companyReport.summary.total_projects}</div>
                </div>
                <div className="rounded-lg border bg-muted/50 p-3">
                  <div className="text-xs text-muted-foreground mb-1">Completion</div>
                  <div className="text-2xl font-bold">{Math.round(companyReport.summary.completion_rate)}%</div>
                </div>
                <div className="rounded-lg border bg-muted/50 p-3">
                  <div className="text-xs text-muted-foreground mb-1">Avg Progress</div>
                  <div className="text-2xl font-bold">{Math.round(companyReport.summary.avg_progress)}%</div>
                </div>
              </div>
            )}

            {/* Charts */}
            {companyReport?.summary && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Workforce Distribution */}
                <div className="rounded-lg border p-4">
                  <h3 className="text-sm font-semibold mb-3">Workforce Allocation</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Overloaded', value: companyReport.summary.overloaded_members, fill: '#ef4444' },
                          { name: 'Normal', value: companyReport.summary.total_members - companyReport.summary.overloaded_members - companyReport.summary.idle_members, fill: '#22c55e' },
                          { name: 'Idle', value: companyReport.summary.idle_members, fill: '#f59e0b' },
                        ]}
                        cx="50%"
                        cy="50%"
                        outerRadius={70}
                        dataKey="value"
                        label={(entry) => `${entry.name}: ${entry.value}`}
                      >
                        {[0, 1, 2].map((_, idx) => (
                          <Cell key={idx} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Ticket Status */}
                <div className="rounded-lg border p-4">
                  <h3 className="text-sm font-semibold mb-3">Ticket Status Overview</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart
                      data={[
                        { status: 'Active', count: companyReport.summary.total_active_tickets },
                        { status: 'Done', count: companyReport.summary.total_done_tickets },
                        { status: 'Blocked', count: companyReport.summary.total_blocked },
                      ]}
                    >
                      <XAxis dataKey="status" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#8b5cf6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Generated Report */}
            {generatedReport && (
              <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">AI-Generated Analysis</h3>
                  {reportTimestamp && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(reportTimestamp).toLocaleString()}
                    </span>
                  )}
                </div>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{generatedReport}</ReactMarkdown>
                </div>
              </div>
            )}
          </motion.div>

          {/* Projects with Risk */}
          <motion.div variants={itemVariants}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">All Projects — Risk & Financial Analysis</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadProjectAnalysisPDF}
                  className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700 transition-all font-medium"
                >
                  <FileText className="h-4 w-4" />
                  Download Project Analysis
                </button>
                <button
                  onClick={handleAnalyzeAll}
                  disabled={analyzingAll || !!analyzingId}
                  className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50 font-medium"
                >
                  {analyzingAll ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing All...</>
                  ) : (
                    <><Zap className="h-4 w-4" /> Analyze All Projects</>
                  )}
                </button>
              </div>
            </div>
            <div className="space-y-4">
              {projects.map((proj: any) => {
                const analysisEntry = analyses[proj.id];
                const analysis = analysisEntry?.result;
                const analysisTime = analysisEntry?.timestamp;
                const isAnalyzing = analyzingId === proj.id;
                const financials = projectFinancials[proj.id];

                return (
                  <div key={proj.id} className="rounded-xl border bg-card hover:shadow-lg transition-all">
                    {/* Project Header */}
                    <div className="p-5 border-b bg-muted/30">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 flex-wrap mb-2">
                            <h3 className="text-lg font-bold">{proj.name}</h3>
                            <span className="text-xs text-muted-foreground px-2 py-1 rounded bg-muted">
                              {proj.team}
                            </span>
                            <span
                              className={cn(
                                'text-xs px-2.5 py-1 rounded font-medium',
                                proj.status === 'Ongoing'
                                  ? 'bg-blue-500/20 text-blue-400'
                                  : proj.status === 'Completed'
                                  ? 'bg-green-500/20 text-green-400'
                                  : 'bg-amber-500/20 text-amber-400',
                              )}
                            >
                              {proj.status}
                            </span>
                          </div>

                          {/* Progress Bar */}
                          <div className="flex items-center gap-3 mb-3">
                            <Progress value={proj.progress} className="h-2 flex-1" />
                            <span className="text-sm font-medium min-w-[3rem] text-right">{proj.progress}%</span>
                          </div>

                          {/* Metrics Grid */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="flex items-center gap-2 text-sm">
                              <Activity className="h-4 w-4 text-blue-400" />
                              <span className="text-muted-foreground">Active:</span>
                              <span className="font-medium">{proj.active_tickets}</span>
                            </div>
                            {proj.blocked_count > 0 && (
                              <div className="flex items-center gap-2 text-sm">
                                <AlertTriangle className="h-4 w-4 text-red-400" />
                                <span className="text-muted-foreground">Blocked:</span>
                                <span className="font-bold text-red-400">{proj.blocked_count}</span>
                              </div>
                            )}
                            {financials && (
                              <>
                                <div className="flex items-center gap-2 text-sm">
                                  <DollarSign className="h-4 w-4 text-amber-400" />
                                  <span className="text-muted-foreground">Cost:</span>
                                  <span className="font-medium text-amber-400">${(financials.cost_to_company / 1000).toFixed(0)}K</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                                  <span className="text-muted-foreground">Revenue:</span>
                                  <span className="font-medium text-emerald-400">${(financials.revenue / 1000).toFixed(0)}K</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                  <BarChart3 className="h-4 w-4" />
                                  <span className="text-muted-foreground">ROI:</span>
                                  <span
                                    className={cn(
                                      'font-bold',
                                      financials.roi >= 0 ? 'text-green-400' : 'text-red-400'
                                    )}
                                  >
                                    {financials.roi}%
                                  </span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {analysis && (
                            <div className="flex flex-col items-end gap-1">
                              <span
                                className={cn(
                                  'text-xs font-bold px-3 py-1.5 rounded',
                                  riskColors[analysis.risk_level] || '',
                                )}
                              >
                                {analysis.risk_level} ({Math.round(analysis.risk_score * 100)}%)
                              </span>
                              {analysisTime && (
                                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {new Date(analysisTime).toLocaleTimeString()}
                                </span>
                              )}
                            </div>
                          )}
                          <button
                            onClick={() => handleAnalyze(proj.id)}
                            disabled={isAnalyzing}
                            className="flex items-center gap-2 text-xs px-4 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50 font-medium"
                          >
                            {isAnalyzing ? (
                              <><Loader2 className="h-3 w-3 animate-spin" /> Analyzing...</>
                            ) : (
                              <><Zap className="h-3 w-3" /> {analysis ? 'Re-analyze' : 'Analyze Risk'}</>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Analysis Details */}
                    {analysis && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="p-5 space-y-4"
                      >
                        <p className="text-sm leading-relaxed">{analysis.primary_reason}</p>

                        {/* Agent Opinions */}
                        {analysis.agent_opinions.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground mb-3">Agent Opinions</p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              {analysis.agent_opinions.map((op) => (
                                <div key={op.agent} className="rounded-lg border bg-muted/30 p-3 text-xs">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="font-semibold">{op.agent}</span>
                                    <span className="text-muted-foreground">{Math.round(op.confidence * 100)}%</span>
                                  </div>
                                  <p className="text-muted-foreground leading-relaxed">{op.claim}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Decision Matrix */}
                        {analysis.decision_comparison.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground mb-3">Decision Matrix</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {analysis.decision_comparison.map((dc) => (
                                <div
                                  key={dc.action}
                                  className={cn(
                                    'rounded-lg border p-3 text-xs',
                                    dc.recommended
                                      ? 'border-green-500/50 bg-green-500/5'
                                      : !dc.feasible
                                        ? 'border-red-500/30 bg-red-500/5'
                                        : 'bg-muted/30',
                                  )}
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="font-semibold">{dc.action}</span>
                                    {dc.recommended ? (
                                      <span className="flex items-center gap-1 text-green-400 text-[10px] font-bold">
                                        <CheckCircle className="h-3 w-3" /> RECOMMENDED
                                      </span>
                                    ) : !dc.feasible ? (
                                      <span className="flex items-center gap-1 text-red-400 text-[10px] font-bold">
                                        <XCircle className="h-3 w-3" /> NOT RECOMMENDED
                                      </span>
                                    ) : null}
                                  </div>
                                  <p className="text-muted-foreground mb-2 leading-relaxed">{dc.reason}</p>
                                  <div className="flex items-center gap-3 text-[11px]">
                                    <span className="text-green-400">Risk ↓ {Math.round(dc.risk_reduction * 100)}%</span>
                                    <span className="text-amber-400">Cost: {dc.cost}</span>
                                    <span className={dc.feasible ? 'text-green-400' : 'text-red-400'}>
                                      {dc.feasible ? 'Feasible' : 'Not Feasible'}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Link to full analysis */}
                        <Link
                          to={`/project/${proj.team_id || 't1'}/${proj.id}/risk`}
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                        >
                          View full analysis <ArrowUpRight className="h-3 w-3" />
                        </Link>
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </motion.div>
  );
};

export default ChairpersonDashboard;
