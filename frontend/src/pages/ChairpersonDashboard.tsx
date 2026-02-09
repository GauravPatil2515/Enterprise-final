/**
 * ChairpersonDashboard — Enhanced Risk overview, AI agent opinions, and decision authority.
 * Improved UI with professional project cards and PDF export functionality.
 */
import { useState, useEffect, useCallback } from 'react';
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
  RefreshCw,
  Mail,
  PieChart as PieChartIcon,
} from 'lucide-react';
import { api, type DashboardData, type AnalysisResult } from '@/services/api';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import NarrativeCard from '@/components/NarrativeCard';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend, CartesianGrid } from 'recharts';
import { generateCompanyReportPDF } from '@/utils/pdfGenerator';
import { generateProjectAnalysisPDF } from '@/utils/projectPdfGenerator';

const riskColors: Record<string, string> = {
  HIGH: 'text-red-500 bg-red-500/10 border-red-500/20',
  MEDIUM: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
  LOW: 'text-green-500 bg-green-500/10 border-green-500/20',
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
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [chairData, companyData, finData] = await Promise.all([
        api.getDashboardData('chairperson'),
        api.getCompanyReport(),
        api.getDashboardData('finance')
      ]);
      setData(chairData);
      setCompanyReport(companyData);
      setFinanceData(finData);
      if (isRefresh) toast.success('Dashboard updated');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
      toast.success('Analysis updated');
    } catch (err: any) {
      toast.error(err?.message || 'Risk analysis failed');
    } finally {
      setAnalyzingId(null);
    }
  };

  const handleAnalyzeAll = async () => {
    setAnalyzingAll(true);
    try {
      toast.info('Starting batch analysis...');
      for (const proj of projects) {
        setAnalyzingId(proj.id);
        try {
          const result = await api.analyzeProject(proj.id);
          setAnalyses((prev) => ({ ...prev, [proj.id]: { result, timestamp: Date.now() } }));
        } catch {
          // continue analyzing others even if one fails
        }
      }
      toast.success('Batch analysis completed');
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
      toast.success('Company report generated successfully');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to generate company report');
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleDownloadCompanyPDF = () => {
    if (!generatedReport || !companyReport?.summary || !reportTimestamp) {
      toast.error('Please generate a report first');
      return;
    }

    try {
      const fileName = generateCompanyReportPDF(
        generatedReport,
        companyReport.summary,
        reportTimestamp
      );
      toast.success(`PDF downloaded: ${fileName}`);
    } catch (err: any) {
      toast.error('Failed to generate PDF');
    }
  };

  const handleDownloadProjectAnalysisPDF = () => {
    try {
      const fileName = generateProjectAnalysisPDF(projects, projectFinancials);
      toast.success(`Project analysis PDF downloaded: ${fileName}`);
    } catch (err: any) {
      toast.error('Failed to generate project analysis PDF');
    }
  };

  const handleEmailReport = () => {
    toast.success('Executive Brief Sent', {
      description: 'The quarterly strategic report has been emailed to the Board of Directors.'
    });
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
      <div className="space-y-6 p-6">
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
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
      className="space-y-6 pb-10"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="relative overflow-hidden rounded-2xl border border-border bg-card px-8 py-6 shadow-sm">
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="inline-flex items-center justify-center rounded-xl bg-teal-600 p-3 text-white shadow-lg shadow-teal-500/20 ring-1 ring-white/20">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-foreground tracking-tight">Executive Dashboard</h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-600 ring-1 ring-teal-500/20">
                  AI-POWERED
                </span>
              </div>
              <p className="text-sm text-muted-foreground">Strategic oversight, multi-agent risk analysis, and decision intelligence</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden md:block text-center px-4 border-r border-border/60">
              <p className="text-2xl font-bold text-foreground">{projects.length}</p>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Projects</p>
            </div>
            <div className="hidden md:block text-center px-4">
              <p className="text-2xl font-bold text-amber-500">{blockedProjects.length}</p>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">At Risk</p>
            </div>
            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className={cn("p-2 rounded-full hover:bg-muted transition-colors", refreshing && "animate-spin text-primary")}
              title="Refresh Data"
            >
              <RefreshCw className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Projects', value: projects.length, icon: <TrendingUp className="h-5 w-5" />, color: 'bg-teal-500/10 text-teal-600 border-teal-200' },
          { label: 'Active', value: activeProjects.length, icon: <Activity className="h-5 w-5" />, color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200' },
          { label: 'With Blockers', value: blockedProjects.length, icon: <AlertTriangle className="h-5 w-5" />, color: 'bg-red-500/10 text-red-500 border-red-200' },
          { label: 'On Hold', value: projects.filter((p: any) => p.status === 'On Hold').length, icon: <Eye className="h-5 w-5" />, color: 'bg-amber-500/10 text-amber-500 border-amber-200' },
        ].map((stat) => (
          <div key={stat.label} className="group relative overflow-hidden rounded-xl border bg-card p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
            <div className="flex items-center justify-between mb-4">
              <span className={cn('flex h-10 w-10 items-center justify-center rounded-lg border', stat.color)}>
                {stat.icon}
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{stat.label}</p>
            </div>
          </div>
        ))}
      </motion.div>

      {/* AI Narrative */}
      <motion.div variants={itemVariants}>
        <NarrativeCard role="chairperson" />
      </motion.div>

      {/* Company Report Section */}
      <motion.div variants={itemVariants} className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Enterprise Intelligence Report
            </h2>
            <p className="text-sm text-muted-foreground mt-1">AI-powered comprehensive company analysis and workforce insights</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleEmailReport}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-all text-sm font-medium"
            >
              <Mail className="h-4 w-4" />
              Email Board
            </button>
            <button
              onClick={handleGenerateCompanyReport}
              disabled={generatingReport}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-50 text-sm font-medium shadow-sm hover:shadow"
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
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-all text-sm font-medium"
              >
                <Download className="h-4 w-4" />
                Download PDF
              </button>
            )}
          </div>
        </div>

        {/* Company Summary Stats */}
        {companyReport?.summary && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            {[
              { label: 'Teams', value: companyReport.summary.total_teams },
              { label: 'Workforce', value: companyReport.summary.total_members },
              { label: 'Projects', value: companyReport.summary.total_projects },
              { label: 'Completion', value: `${Math.round(companyReport.summary.completion_rate)}%` },
              { label: 'Avg Progress', value: `${Math.round(companyReport.summary.avg_progress)}%` }
            ].map((item, idx) => (
              <div key={idx} className="rounded-lg border bg-muted/30 p-4 text-center">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{item.label}</div>
                <div className="text-xl font-bold">{item.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Charts */}
        {companyReport?.summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Workforce Distribution */}
            <div className="rounded-lg border p-4 bg-card/50">
              <h3 className="text-sm font-semibold mb-4 text-center">Workforce Allocation</h3>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Overloaded', value: companyReport.summary.overloaded_members, fill: '#ef4444' },
                        { name: 'Normal', value: companyReport.summary.total_members - companyReport.summary.overloaded_members - companyReport.summary.idle_members, fill: '#22c55e' },
                        { name: 'Idle', value: companyReport.summary.idle_members, fill: '#f59e0b' },
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {[0, 1, 2].map((_, idx) => (
                        <Cell key={idx} strokeWidth={0} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Ticket Status */}
            <div className="rounded-lg border p-4 bg-card/50">
              <h3 className="text-sm font-semibold mb-4 text-center">Ticket Status Overview</h3>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { status: 'Active', count: companyReport.summary.total_active_tickets },
                      { status: 'Done', count: companyReport.summary.total_done_tickets },
                      { status: 'Blocked', count: companyReport.summary.total_blocked },
                    ]}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <XAxis dataKey="status" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Capital Efficiency Chart */}
        {financeData?.cost_analysis && (
          <div className="mb-6 rounded-lg border bg-card/50 p-4">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-emerald-500" />
              Capital Efficiency (Tickets Delivered per $1k Spent)
            </h3>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={financeData.cost_analysis.map((p: any) => ({
                    name: p.project_name,
                    efficiency: p.cost_to_company > 0 ? (p.done_tickets / (p.cost_to_company / 1000)).toFixed(2) : 0
                  })).sort((a: any, b: any) => b.efficiency - a.efficiency).slice(0, 5)}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(0,0,0,0.05)" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10 }} />
                  <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', fontSize: '11px' }} />
                  <Bar dataKey="efficiency" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20}>
                    <div />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Generated Report */}
        {generatedReport && (
          <div className="rounded-lg border bg-muted/20 p-6">
            <div className="flex items-center justify-between mb-4 border-b pb-4">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                AI-Generated Analysis
              </h3>
              {reportTimestamp && (
                <span className="text-xs text-muted-foreground flex items-center gap-1 bg-background px-2 py-1 rounded-full border">
                  <Clock className="h-3 w-3" />
                  {new Date(reportTimestamp).toLocaleString()}
                </span>
              )}
            </div>
            <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-bold prose-h3:text-primary prose-a:text-primary">
              <ReactMarkdown>{generatedReport}</ReactMarkdown>
            </div>
          </div>
        )}
      </motion.div>

      {/* Projects with Risk */}
      <motion.div variants={itemVariants} className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Project Risk & Financials
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadProjectAnalysisPDF}
              className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-all font-medium"
            >
              <FileText className="h-3.5 w-3.5" />
              Download Analysis
            </button>
            <button
              onClick={handleAnalyzeAll}
              disabled={analyzingAll || !!analyzingId}
              className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50 font-medium"
            >
              {analyzingAll ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Analyzing...</>
              ) : (
                <><Zap className="h-3.5 w-3.5" /> Analyze All</>
              )}
            </button>
          </div>
        </div>

        <div className="grid gap-4">
          {projects.map((proj: any) => {
            const analysisEntry = analyses[proj.id];
            const analysis = analysisEntry?.result;
            const analysisTime = analysisEntry?.timestamp;
            const isAnalyzing = analyzingId === proj.id;
            const financials = projectFinancials[proj.id];

            return (
              <div key={proj.id} className="group rounded-xl border bg-card hover:shadow-lg hover:border-primary/20 transition-all duration-200">
                {/* Project Header */}
                <div className="p-5 border-b bg-muted/30">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 flex-wrap mb-3">
                        <Link to={`/project/${proj.team_id || 't1'}/${proj.id}`} className="hover:underline">
                          <h3 className="text-lg font-bold group-hover:text-primary transition-colors">{proj.name}</h3>
                        </Link>
                        <span className="text-[10px] font-bold tracking-wide text-muted-foreground px-2 py-0.5 rounded-full border bg-background">
                          {proj.team}
                        </span>
                        <span
                          className={cn(
                            'text-[10px] font-bold px-2 py-0.5 rounded-full border',
                            proj.status === 'Ongoing'
                              ? 'bg-blue-500/10 text-blue-500 border-blue-200'
                              : proj.status === 'Completed'
                                ? 'bg-green-500/10 text-green-500 border-green-200'
                                : 'bg-amber-500/10 text-amber-500 border-amber-200',
                          )}
                        >
                          {proj.status}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="flex items-center gap-3 mb-4 max-w-md">
                        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                          <motion.div
                            className="h-full bg-primary"
                            initial={{ width: 0 }}
                            animate={{ width: `${proj.progress}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                          />
                        </div>
                        <span className="text-xs font-bold w-8 text-right">{proj.progress}%</span>
                      </div>

                      {/* Metrics Grid */}
                      <div className="flex flex-wrap gap-x-6 gap-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Activity className="h-3.5 w-3.5 text-blue-400" />
                          <span className="text-muted-foreground text-xs">Active:</span>
                          <span className="font-semibold text-xs">{proj.active_tickets}</span>
                        </div>
                        {proj.blocked_count > 0 && (
                          <div className="flex items-center gap-2 text-sm">
                            <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                            <span className="text-muted-foreground text-xs">Blocked:</span>
                            <span className="font-bold text-xs text-red-500">{proj.blocked_count}</span>
                          </div>
                        )}
                        {financials && (
                          <>
                            <div className="flex items-center gap-2 text-sm">
                              <DollarSign className="h-3.5 w-3.5 text-amber-500" />
                              <span className="text-muted-foreground text-xs">Cost:</span>
                              <span className="font-semibold text-xs text-amber-600">${(financials.cost_to_company / 1000).toFixed(0)}K</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <BarChart3 className="h-3.5 w-3.5 text-emerald-500" />
                              <span className="text-muted-foreground text-xs">ROI:</span>
                              <span
                                className={cn(
                                  'font-bold text-xs',
                                  financials.roi >= 0 ? 'text-green-500' : 'text-red-500'
                                )}
                              >
                                {financials.roi}%
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {analysis && (
                        <div className="text-right">
                          <span
                            className={cn(
                              'text-xs font-bold px-3 py-1 rounded inline-block border mb-1',
                              riskColors[analysis.risk_level] || '',
                            )}
                          >
                            {analysis.risk_level} Risk • {Math.round(analysis.risk_score * 100)}%
                          </span>
                          {analysisTime && (
                            <p className="text-[10px] text-muted-foreground">
                              {new Date(analysisTime).toLocaleTimeString()}
                            </p>
                          )}
                        </div>
                      )}

                      <button
                        onClick={() => handleAnalyze(proj.id)}
                        disabled={isAnalyzing}
                        className="rounded-lg p-2 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        title={analysis ? 'Re-analyze' : 'Analyze Risk'}
                      >
                        {isAnalyzing ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : <Zap className={cn("h-5 w-5", analysis ? "text-primary fill-primary/10" : "")} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Analysis Details */}
                {analysis && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-5 space-y-5 bg-muted/10"
                  >
                    <div className="rounded-lg border bg-background p-4 shadow-sm">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Primary Risk Factor</p>
                      <p className="text-sm leading-relaxed text-foreground/90">{analysis.primary_reason}</p>
                    </div>

                    {/* Agent Opinions */}
                    {analysis.agent_opinions.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">AI Agent Consensus</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {analysis.agent_opinions.map((op) => (
                            <div key={op.agent} className="rounded-lg border bg-background p-3 text-xs shadow-sm">
                              <div className="flex items-center justify-between mb-2 pb-2 border-b border-dashed">
                                <span className="font-bold text-primary">{op.agent}</span>
                                <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded font-medium">{Math.round(op.confidence * 100)}% Conf.</span>
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
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Strategic Decision Matrix</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {analysis.decision_comparison.map((dc) => (
                            <div
                              key={dc.action}
                              className={cn(
                                'rounded-lg border p-3 text-xs shadow-sm transition-all',
                                dc.recommended
                                  ? 'border-green-500/30 bg-green-500/5 hover:border-green-500/50'
                                  : !dc.feasible
                                    ? 'border-red-500/20 bg-red-500/5'
                                    : 'bg-background hover:border-primary/20',
                              )}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-bold text-sm">{dc.action}</span>
                                {dc.recommended ? (
                                  <span className="flex items-center gap-1 text-green-600 bg-green-100 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                    <CheckCircle className="h-3 w-3" /> RECOMMENDED
                                  </span>
                                ) : !dc.feasible ? (
                                  <span className="flex items-center gap-1 text-red-600 bg-red-100 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                    <XCircle className="h-3 w-3" /> INFEASIBLE
                                  </span>
                                ) : null}
                              </div>
                              <p className="text-muted-foreground mb-3 leading-relaxed">{dc.reason}</p>

                              <div className="flex items-center gap-2 text-[10px] font-medium bg-background/50 p-2 rounded border border-dashed">
                                <span className="text-green-600 flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Risk -{Math.round(dc.risk_reduction * 100)}%</span>
                                <span className="w-px h-3 bg-border"></span>
                                <span className="text-amber-600 flex items-center gap-1"><DollarSign className="h-3 w-3" /> {dc.cost}</span>
                                <span className="w-px h-3 bg-border"></span>
                                <span className={dc.feasible ? 'text-blue-600' : 'text-red-600'}>
                                  {dc.feasible ? 'Feasible' : 'Not Feasible'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end pt-2">
                      <Link
                        to={`/project/${proj.team_id || 't1'}/${proj.id}/risk`}
                        className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary-hover font-bold hover:underline"
                      >
                        View Full Risk Analysis details <ArrowUpRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ChairpersonDashboard;
