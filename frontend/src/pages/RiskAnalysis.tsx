import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
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
} from 'lucide-react';
import { api, AnalysisResult, RiskSnapshot } from '@/services/api';
import { useTeams } from '@/context/TeamsContext';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';

const RiskAnalysis = () => {
  const { teamId, projectId } = useParams<{ teamId: string; projectId: string }>();
  const { state } = useTeams();
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<RiskSnapshot[]>([]);
  const [savingSnapshot, setSavingSnapshot] = useState(false);
  const [postmortem, setPostmortem] = useState<string | null>(null);
  const [generatingPM, setGeneratingPM] = useState(false);
  const trendCanvasRef = useRef<HTMLCanvasElement>(null);

  const team = state.teams.find((t) => t.id === teamId);
  const project = team?.projects.find((p) => p.id === projectId);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    setError(null);

    api
      .analyzeProject(projectId)
      .then((data) => {
        setAnalysis(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Analysis failed');
        setLoading(false);
      });
  }, [projectId]);

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
    ctx.strokeStyle = 'rgba(128,128,128,0.15)';
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
    grad.addColorStop(0, 'rgba(239,68,68,0.25)');
    grad.addColorStop(1, 'rgba(239,68,68,0.02)');
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
    ctx.stroke();

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
      <div className="flex h-96 items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <div>
            <h2 className="text-lg font-semibold">Analyzing Project Risk</h2>
            <p className="text-sm text-muted-foreground mt-1">
              AI agents are debating delivery risks...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center space-y-4">
          <AlertTriangle className="h-8 w-8 text-destructive mx-auto" />
          <div>
            <h2 className="text-lg font-semibold">Analysis Failed</h2>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
          </div>
          <Button onClick={() => window.location.reload()} variant="outline">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!analysis) return null;

  const riskColor =
    analysis.risk_level === 'HIGH'
      ? 'text-red-600 dark:text-red-400'
      : analysis.risk_level === 'MEDIUM'
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-emerald-600 dark:text-emerald-400';

  const riskBg =
    analysis.risk_level === 'HIGH'
      ? 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900/50'
      : analysis.risk_level === 'MEDIUM'
      ? 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900/50'
      : 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/50';

  const riskPercent = Math.round(analysis.risk_score * 100);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Breadcrumb */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
          <Link to="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
          <span className="text-border">/</span>
          <Link to={`/project/${teamId}/${projectId}`} className="hover:text-foreground transition-colors">
            {project?.name || projectId}
          </Link>
          <span className="text-border">/</span>
          <span className="text-foreground">Risk Analysis</span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            to={`/project/${teamId}/${projectId}`}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors -ml-1.5"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                AI Risk Analysis
              </h1>
              <p className="text-sm text-muted-foreground">
                Multi-agent intelligence for {project?.name || projectId}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Risk Score Hero Card */}
      <motion.div variants={itemVariants} className={cn('rounded-xl border p-6', riskBg)}>
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          {/* Score Gauge */}
          <div className="flex flex-col items-center gap-2 min-w-[140px]">
            <div className="relative h-28 w-28">
              <svg className="h-28 w-28 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/30" />
                <circle
                  cx="50" cy="50" r="42" fill="none"
                  stroke="currentColor" strokeWidth="8"
                  strokeDasharray={`${riskPercent * 2.64} 264`}
                  strokeLinecap="round"
                  className={riskColor}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={cn('text-3xl font-bold', riskColor)}>{riskPercent}%</span>
              </div>
            </div>
            <span className={cn('text-sm font-semibold uppercase tracking-wider', riskColor)}>
              {analysis.risk_level} RISK
            </span>
          </div>

          {/* Primary Reason */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                AI Summary
              </span>
            </div>
            <p className="text-sm leading-relaxed text-foreground/90">
              {analysis.primary_reason}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Risk Trend Chart */}
      <motion.div variants={itemVariants} className="rounded-xl border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Risk Trend</h2>
            {history.length > 0 && (
              <span className="text-xs text-muted-foreground">
                ({history.length} snapshots)
              </span>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveSnapshot}
            disabled={savingSnapshot}
            className="gap-1.5"
          >
            {savingSnapshot ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Save Snapshot
          </Button>
        </div>

        {history.length >= 2 ? (
          <canvas
            ref={trendCanvasRef}
            className="w-full h-40 rounded-lg"
            style={{ display: 'block' }}
          />
        ) : (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
            {history.length === 1
              ? 'Need at least 2 snapshots to show a trend line. Click "Save Snapshot" again.'
              : 'No snapshots yet. Click "Save Snapshot" to start tracking risk over time.'}
          </div>
        )}
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Agent Debate Panel */}
        <motion.div variants={itemVariants} className="rounded-xl border bg-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Agent Opinions</h2>
          </div>

          <div className="space-y-4">
            {analysis.agent_opinions.map((opinion, idx) => {
              const conf = Math.round(opinion.confidence * 100);
              const agentIcon =
                opinion.agent === 'RiskAgent' ? AlertTriangle :
                opinion.agent === 'ConstraintAgent' ? Shield :
                Zap;
              const AgentIcon = agentIcon;

              return (
                <div key={idx} className="rounded-lg border bg-muted/30 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AgentIcon className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold">{opinion.agent}</span>
                    </div>
                    <span className={cn(
                      'text-xs font-medium px-2 py-0.5 rounded-full',
                      conf >= 80 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                      conf >= 60 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                      'bg-muted text-muted-foreground'
                    )}>
                      {conf}% confidence
                    </span>
                  </div>

                  <p className="text-sm text-foreground/80">{opinion.claim}</p>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Confidence</span>
                      <span>{conf}%</span>
                    </div>
                    <Progress value={conf} className="h-1.5" />
                  </div>

                  {opinion.evidence.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground font-medium">Evidence:</span>
                      <ul className="space-y-1">
                        {opinion.evidence.map((e, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                            <Info className="h-3 w-3 mt-0.5 shrink-0" />
                            {e}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Decision Comparison Matrix */}
        <motion.div variants={itemVariants} className="rounded-xl border bg-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Decision Matrix</h2>
          </div>

          <div className="space-y-3">
            {analysis.decision_comparison.map((decision, idx) => (
              <div
                key={idx}
                className={cn(
                  'rounded-lg border p-4 space-y-2',
                  decision.recommended
                    ? 'bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/50'
                    : !decision.feasible
                    ? 'bg-red-50/50 border-red-200 dark:bg-red-950/20 dark:border-red-900/50'
                    : 'bg-muted/30'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {decision.recommended ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    ) : !decision.feasible ? (
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    ) : (
                      <Info className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="text-sm font-semibold">{decision.action}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {decision.recommended && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400">
                        RECOMMENDED
                      </span>
                    )}
                    {!decision.feasible && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400">
                        NOT FEASIBLE
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Risk Reduction</span>
                    <p className="font-semibold text-foreground">{Math.round(decision.risk_reduction * 100)}%</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Cost</span>
                    <p className={cn('font-semibold',
                      decision.cost === 'Low' ? 'text-emerald-600 dark:text-emerald-400' :
                      decision.cost === 'Medium' ? 'text-amber-600 dark:text-amber-400' :
                      'text-red-600 dark:text-red-400'
                    )}>
                      {decision.cost}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Feasible</span>
                    <p className="font-semibold">{decision.feasible ? 'Yes' : 'No'}</p>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">{decision.reason}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Supporting Signals */}
      {analysis.supporting_signals.length > 0 && (
        <motion.div variants={itemVariants} className="rounded-xl border bg-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Supporting Signals</h2>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {analysis.supporting_signals.map((signal, idx) => (
              <div key={idx} className="flex items-start gap-2 rounded-lg bg-muted/30 p-3">
                <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-500 shrink-0" />
                <span className="text-sm text-foreground/80">{signal}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Recommended Actions */}
      {analysis.recommended_actions.length > 0 && (
        <motion.div variants={itemVariants} className="rounded-xl border bg-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Recommended Actions</h2>
          </div>
          <div className="space-y-2">
            {analysis.recommended_actions.map((action, idx) => (
              <div key={idx} className="flex items-center gap-3 rounded-lg bg-primary/5 border border-primary/10 p-3">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                <span className="text-sm font-medium text-foreground">{action}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Postmortem Generator */}
      <motion.div variants={itemVariants} className="rounded-xl border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Postmortem Report</h2>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleGeneratePostmortem}
            disabled={generatingPM}
            className="gap-1.5"
          >
            {generatingPM ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileText className="h-3.5 w-3.5" />
            )}
            {generatingPM ? 'Generating…' : 'Generate Postmortem'}
          </Button>
        </div>

        {postmortem ? (
          <div className="prose prose-sm dark:prose-invert max-w-none rounded-lg bg-muted/30 p-4 max-h-[500px] overflow-y-auto scrollbar-thin">
            <ReactMarkdown>{postmortem}</ReactMarkdown>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Click "Generate Postmortem" to create an AI-powered incident report
            based on the current risk analysis data.
          </p>
        )}
      </motion.div>
    </motion.div>
  );
};

export default RiskAnalysis;
