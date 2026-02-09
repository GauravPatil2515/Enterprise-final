import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Brain,
  TrendingDown,
  TrendingUp,
  Zap,
  Info,
  Loader2,
  Save,
  FileText,
  Activity,
  Bot,
  Target,
  BarChart3,
  Search,
  X,
  Send,
  Mail,
  MessageSquare
} from 'lucide-react';
import { api, AnalysisResult, RiskSnapshot } from '@/services/api';
import { useTeams } from '@/context/TeamsContext';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';

// ─── Sub-components ─────────────────────────────────────────────────────────

const LiveIndicator = () => (
  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
    </span>
    <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">
      Live Monitoring
    </span>
  </div>
);

const ConfidenceBar = ({ value, label }: { value: number; label?: string }) => (
  <div className="space-y-1 w-full">
    <div className="flex justify-between text-[10px] uppercase font-bold text-muted-foreground/80 tracking-wider">
      <span>{label || 'Confidence'}</span>
      <span>{value}%</span>
    </div>
    <div className="h-1.5 w-full bg-secondary/50 rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 1, ease: "circOut" }}
        className={cn(
          "h-full rounded-full shadow-[0_0_10px_rgba(0,0,0,0.2)]",
          value > 80 ? "bg-gradient-to-r from-emerald-500 to-teal-400" :
            value > 50 ? "bg-gradient-to-r from-amber-500 to-orange-400" :
              "bg-gradient-to-r from-red-500 to-rose-400"
        )}
      />
    </div>
  </div>
);

const AgentCard = ({ opinion, delay }: { opinion: AnalysisResult['agent_opinions'][0]; delay: number }) => {
  const conf = Math.round(opinion.confidence * 100);
  const AgentIcon = opinion.agent === 'RiskAgent' ? AlertTriangle : opinion.agent === 'ConstraintAgent' ? Shield : Zap;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.1 }}
      className="group relative overflow-hidden rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-5 hover:border-primary/20 transition-all hover:shadow-lg"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="relative flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-lg border shadow-sm",
              opinion.agent === 'RiskAgent' ? "bg-red-500/10 border-red-500/20 text-red-500" :
                opinion.agent === 'ConstraintAgent' ? "bg-blue-500/10 border-blue-500/20 text-blue-500" :
                  "bg-amber-500/10 border-amber-500/20 text-amber-500"
            )}>
              <AgentIcon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-foreground">{opinion.agent}</h3>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Active Analysis</p>
            </div>
          </div>
        </div>

        {/* Claim */}
        <p className="text-sm font-medium leading-relaxed text-foreground/90 bg-muted/30 p-3 rounded-lg border border-border/40">
          "{opinion.claim}"
        </p>

        {/* Visualization */}
        <ConfidenceBar value={conf} />

        {/* Evidence */}
        {opinion.evidence.length > 0 && (
          <div className="mt-1 space-y-2">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              <Search className="h-3 w-3" /> Signals Detected
            </div>
            <div className="flex flex-wrap gap-1.5">
              {opinion.evidence.map((e, i) => (
                <span key={i} className="inline-flex items-center rounded-md bg-background border border-border/60 px-2 py-1 text-[10px] text-muted-foreground shadow-sm">
                  {e}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Action Dialog Component
const ActionDialog = ({
  item,
  onClose,
  onSend
}: {
  item: any,
  onClose: () => void,
  onSend: () => void
}) => {
  const [method, setMethod] = useState<'email' | 'slack'>('email');
  const [sending, setSending] = useState(false);

  const handleSend = () => {
    setSending(true);
    setTimeout(() => {
      onSend();
      onClose();
    }, 1500);
  };

  const draftText = item.action === 'Escalate Dependency'
    ? `Subject: URGENT: Dependency Block on ${item.id || 'Project'}

Hi Team,

We are currently blocked by [Dependency Name]. This is impacting our delivery timeline by approximately 4 days. Can we prioritize this?

Priority: High
Risk Impact: ${Math.round(item.risk_reduction * 100)}% reduction`
    : item.action === 'Reduce Scope'
      ? `Subject: Proposal: Scope Reduction for MVP

Hi Stakeholders,

To ensure we meet the deadline, I propose deferring [Feature X] to Phase 2. This will reduce delivery risk by ${Math.round(item.risk_reduction * 100)}%.

See attached analysis.`
      : `Subject: Action Required: ${item.action}

Please review the attached remediation plan for ${item.action}.`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            Execute Action: {item.action}
          </h3>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-4 space-y-4">
          <div className="flex gap-2">
            <Button
              variant={method === 'email' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMethod('email')}
              className="gap-2"
            >
              <Mail className="h-4 w-4" /> Email Draft
            </Button>
            <Button
              variant={method === 'slack' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMethod('slack')}
              className="gap-2"
            >
              <MessageSquare className="h-4 w-4" /> Slack Message
            </Button>
          </div>

          <div className="relative">
            <textarea
              className="w-full h-48 p-4 bg-muted/30 rounded-lg border border-border font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none whitespace-pre-wrap"
              defaultValue={draftText}
            />
            <div className="absolute bottom-3 right-3 text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
              AI Generated Draft
            </div>
          </div>

          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5" />
            <div className="text-xs">
              <p className="font-semibold text-emerald-600">Predicted Impact</p>
              <p className="text-muted-foreground">Sending this is projected to reduce risk by <span className="text-foreground font-bold">{Math.round(item.risk_reduction * 100)}%</span>.</p>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-border flex justify-end gap-2 bg-muted/10">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSend} disabled={sending} className="min-w-[100px]">
            {sending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</>
            ) : (
              <><Send className="mr-2 h-4 w-4" /> Send Now</>
            )}
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────

const RiskAnalysis = () => {
  const { teamId, projectId } = useParams<{ teamId: string; projectId: string }>();
  const { state } = useTeams();
  // const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  // const [loading, setLoading] = useState(true);
  // const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<RiskSnapshot[]>([]);
  const [savingSnapshot, setSavingSnapshot] = useState(false);
  const [postmortem, setPostmortem] = useState<string | null>(null);
  const [generatingPM, setGeneratingPM] = useState(false);
  const [selectedAction, setSelectedAction] = useState<any>(null); // For Action Dialog
  const trendCanvasRef = useRef<HTMLCanvasElement>(null);

  const team = state.teams.find((t) => t.id === teamId);
  const project = team?.projects.find((p) => p.id === projectId);

  const { data: analysis, isLoading, error: queryError } = useQuery({
    queryKey: ['risk-analysis', projectId],
    queryFn: () => api.analyzeProject(projectId!),
    enabled: !!projectId,
    refetchInterval: 30000, // Poll every 30s as backup
  });

  const loading = isLoading;
  const error = queryError ? (queryError as Error).message : null;

  // Fetch risk history for trend chart
  useEffect(() => {
    if (!projectId) return;
    api.getRiskHistory(projectId).then(setHistory).catch((err) => console.warn('Risk history unavailable:', err));
  }, [projectId]);

  // Draw trend sparkline on canvas
  useEffect(() => {
    const canvas = trendCanvasRef.current;
    if (!canvas || history.length < 2) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const W = rect.width;
    const H = rect.height;

    ctx.clearRect(0, 0, W, H);

    const scores = history.map((s) => s.risk_score);
    const maxScore = Math.max(...scores, 0.5);
    const step = W / (scores.length - 1);

    // Grid lines
    ctx.strokeStyle = 'rgba(128,128,128,0.1)';
    ctx.lineWidth = 1;
    for (let y = 0; y <= 1; y += 0.25) {
      const py = H - (y / maxScore) * (H - 20) - 10;
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(W, py);
      ctx.stroke();
    }

    // Area fill
    ctx.beginPath();
    ctx.moveTo(0, H);
    scores.forEach((s, i) => {
      const x = i * step;
      const y = H - (s / maxScore) * (H - 20) - 10;
      ctx.lineTo(x, y);
    });
    ctx.lineTo(W, H);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, 'rgba(239,68,68,0.2)');
    grad.addColorStop(1, 'rgba(239,68,68,0.0)');
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    scores.forEach((s, i) => {
      const x = i * step;
      const y = H - (s / maxScore) * (H - 20) - 10;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(239,68,68,0.5)';
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Dots
    scores.forEach((s, i) => {
      const x = i * step;
      const y = H - (s / maxScore) * (H - 20) - 10;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#ef4444';
      ctx.fill();
    });
  }, [history]);

  // Save current analysis as a snapshot
  const handleSaveSnapshot = async () => {
    if (!projectId || savingSnapshot) return;
    setSavingSnapshot(true);
    try {
      const snap = await api.saveRiskSnapshot(projectId);
      setHistory((prev) => [...prev, snap]);
      toast.success("Risk snapshot saved to history");
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save snapshot');
    }
    setSavingSnapshot(false);
  };

  // Generate postmortem report
  const handleGeneratePostmortem = async () => {
    if (!projectId || generatingPM) return;
    setGeneratingPM(true);
    try {
      const result = await api.generatePostmortem(projectId);
      setPostmortem(result.postmortem);
    } catch {
      setPostmortem('Failed to generate postmortem. Please try again.');
    }
    setGeneratingPM(false);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center bg-grid-black/[0.02] dark:bg-grid-white/[0.02]">
        <div className="text-center space-y-6 max-w-md p-8 rounded-2xl bg-background/50 backdrop-blur-sm border border-border/50 shadow-xl">
          <div className="relative mx-auto h-16 w-16">
            <div className="absolute inset-0 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            <div className="absolute inset-2 rounded-full border-4 border-primary/10 border-b-primary animate-spin direction-reverse duration-1000" />
            <Bot className="absolute inset-0 m-auto h-6 w-6 text-primary animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Synthesizing Risk Model
            </h2>
            <div className="mt-3 space-y-1">
              <p className="text-sm font-medium text-foreground">AI Agents are debating strategy...</p>
              <p className="text-xs text-muted-foreground animate-pulse">Analyzing graph topology & constraints</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="text-center space-y-4 max-w-md p-8 bg-destructive/5 rounded-2xl border border-destructive/20">
          <AlertTriangle className="h-10 w-10 text-destructive mx-auto" />
          <div>
            <h2 className="text-lg font-bold text-destructive">Analysis Failed</h2>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
          </div>
          <Button onClick={() => window.location.reload()} variant="outline" className="border-destructive/20 hover:bg-destructive/10">
            Retry Analysis
          </Button>
        </div>
      </div>
    );
  }

  if (!analysis) return null;

  const riskPercent = Math.round(analysis.risk_score * 100);
  const colorClass =
    analysis.risk_level === 'HIGH' ? 'text-red-500' :
      analysis.risk_level === 'MEDIUM' ? 'text-amber-500' : 'text-emerald-500';

  const bgClass =
    analysis.risk_level === 'HIGH' ? 'bg-red-500/10 border-red-500/20' :
      analysis.risk_level === 'MEDIUM' ? 'bg-amber-500/10 border-amber-500/20' : 'bg-emerald-500/10 border-emerald-500/20';

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8 pb-10"
    >
      {/* Action Simulation Dialog */}
      <AnimatePresence>
        {selectedAction && (
          <ActionDialog
            item={selectedAction}
            onClose={() => setSelectedAction(null)}
            onSend={() => toast.success("Action executed successfully", { description: "Stakeholders notified." })}
          />
        )}
      </AnimatePresence>

      {/* ─── Header ─── */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1">
            <Link to="/role-dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
            <span className="text-border">/</span>
            <Link to={`/project/${teamId}/${projectId}`} className="hover:text-foreground transition-colors">
              {project?.name || projectId}
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Risk Analysis</h1>
            <LiveIndicator />
          </div>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Real-time multi-agent intelligence analyzing project velocity, dependencies, and team constraints.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveSnapshot}
            disabled={savingSnapshot}
            className="gap-2 border-primary/20 hover:bg-primary/5"
          >
            {savingSnapshot ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Snapshot
          </Button>
        </div>
      </motion.div>

      {/* ─── Hero Section ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Risk Gauge Card */}
        <motion.div variants={itemVariants} className="relative overflow-hidden rounded-2xl border bg-card p-6 shadow-sm group">
          <div className="absolute top-0 right-0 p-4 opacity-50">
            <Activity className={cn("h-24 w-24 opacity-10", colorClass)} />
          </div>

          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-6 flex items-center gap-2">
            <Target className="h-4 w-4" /> Overall Risk Score
          </h3>

          <div className="flex items-center gap-8">
            <div className="relative h-32 w-32 shrink-0">
              <svg className="h-32 w-32 -rotate-90 filter drop-shadow-md" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/10" />
                <circle
                  cx="50" cy="50" r="42" fill="none"
                  stroke="currentColor" strokeWidth="8"
                  strokeDasharray={`${riskPercent * 2.64} 264`}
                  strokeLinecap="round"
                  className={colorClass}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={cn('text-4xl font-bold tracking-tight', colorClass)}>{riskPercent}%</span>
              </div>
            </div>
            <div>
              <div className={cn("inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border mb-2", bgClass, colorClass)}>
                {analysis.risk_level} RISK DETECTED
              </div>
              <p className="text-sm text-muted-foreground leading-snug">
                {analysis.primary_reason}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Trend Chart (Spans 2 cols) */}
        <motion.div variants={itemVariants} className="lg:col-span-2 relative h-full min-h-[220px] rounded-2xl border bg-card p-6 shadow-sm overflow-hidden">
          <div className="absolute inset-0 bg-grid-black/[0.02] dark:bg-grid-white/[0.02]" />
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" /> Risk Trend Velocity
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Tracking algorithmic risk assessments over time
                </p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold font-mono text-foreground">
                  {history.length > 0 ? (history[history.length - 1].risk_score * 100).toFixed(0) : 0}%
                </span>
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Current</p>
              </div>
            </div>

            {history.length >= 2 ? (
              <canvas
                ref={trendCanvasRef}
                className="w-full h-32 mt-4"
                style={{ display: 'block' }}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center border-2 border-dashed border-muted rounded-xl mt-4 bg-muted/10">
                <p className="text-sm text-muted-foreground font-medium flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Need more data points to visualize trend
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* ─── Agents Section ─── */}
      <motion.div variants={itemVariants} className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2 px-1">
          <Bot className="h-5 w-5 text-primary" />
          Generative Agent Consensus
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {analysis.agent_opinions.map((op, i) => (
            <AgentCard key={op.agent} opinion={op} delay={i} />
          ))}
        </div>
      </motion.div>

      {/* ─── Decision Intelligence ─── */}
      <motion.div variants={itemVariants} className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2 px-1">
          <Brain className="h-5 w-5 text-primary" />
          Strategic Decision Matrix
        </h2>

        <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
          <div className="grid grid-cols-1 divide-y lg:divide-y-0 lg:divide-x lg:grid-cols-2">
            {analysis.decision_comparison.map((d, i) => (
              <div
                key={i}
                onClick={() => d.recommended && setSelectedAction(d)} // Make actionable!
                className={cn(
                  "p-6 transition-colors group relative",
                  d.recommended ? "bg-gradient-to-br from-emerald-500/5 to-transparent hover:from-emerald-500/10 cursor-pointer" : "",
                  !d.feasible ? "bg-muted/10 opacity-70" : ""
                )}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "h-10 w-10 rounded-full flex items-center justify-center border",
                      d.recommended ? "bg-emerald-500 text-white border-emerald-600 shadow-md shadow-emerald-500/20" :
                        !d.feasible ? "bg-muted text-muted-foreground border-border" :
                          "bg-card text-foreground border-border"
                    )}>
                      {d.recommended ? <CheckCircle2 className="h-5 w-5" /> :
                        !d.feasible ? <AlertTriangle className="h-5 w-5" /> :
                          <Zap className="h-5 w-5" />}
                    </div>
                    <div>
                      <h4 className="font-bold text-base flex items-center gap-2 group-hover:underline decoration-emerald-500/50 underline-offset-4 decoration-2">{d.action}
                        {d.recommended &&
                          <span className="text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded-full font-bold shadow-sm">RECOMMENDED</span>
                        }
                      </h4>
                      <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                        Cost: <span className={d.cost === 'High' ? 'text-red-500' : 'text-emerald-500'}>{d.cost}</span>
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-foreground/80 mb-6 min-h-[3rem]">
                  {d.reason}
                </p>

                <div className="space-y-3 bg-card/50 rounded-xl border border-border/40 p-4">
                  <div className="flex justify-between items-center text-xs font-medium text-muted-foreground">
                    <span className="flex items-center gap-1.5"><BarChart3 className="h-3.5 w-3.5" /> Monte Carlo Simulation</span>
                    <span className="text-foreground font-bold">{(d.risk_reduction * 100).toFixed(0)}% Reduction</span>
                  </div>
                  {/* Simulated Distribution Bar */}
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden flex">
                    <div style={{ width: `${d.risk_reduction * 100}%` }} className={cn(
                      "h-full rounded-full opacity-80",
                      d.recommended ? "bg-emerald-500" : "bg-primary"
                    )} />
                    <div style={{ width: `${(1 - d.risk_reduction) * 20}%` }} className="h-full bg-primary/20 blur-[2px]" />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                    <span>p10: {(d.risk_reduction * 0.8 * 100).toFixed(0)}%</span>
                    <span>p90: {(d.risk_reduction * 1.1 * 100).toFixed(0)}%</span>
                  </div>
                </div>

                {d.recommended && (
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity bg-background border px-2 py-1 rounded text-xs font-bold text-emerald-600 shadow-sm pointer-events-none">
                    Click to Execute
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ─── Postmortem ─── */}
      <motion.div variants={itemVariants} className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Incident Postmortem</h2>
              <p className="text-xs text-muted-foreground">Automated root cause analysis generation</p>
            </div>
          </div>
          <Button
            onClick={handleGeneratePostmortem}
            disabled={generatingPM}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {generatingPM ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating AI Report...</>
            ) : (
              "Generate Report"
            )}
          </Button>
        </div>

        <div className="relative min-h-[200px] rounded-xl border-2 border-dashed border-border/60 bg-muted/10 p-6 transition-all">
          {postmortem ? (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{postmortem}</ReactMarkdown>
            </div>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
              <Bot className="h-8 w-8 mb-3 opacity-20" />
              <p className="text-sm">No report generated yet.</p>
              <p className="text-xs opacity-70">Click the button above to synthesize findings.</p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default RiskAnalysis;
