/**
 * AI Transparency UI Components
 *
 * ConfidenceMeter — Circular gauge showing AI confidence (0-100%)
 * ModelBadge — Pill showing which AI model processed a response
 * AgentReasoningCard — Expandable card showing agent reasoning chain
 * IntentBadge — Shows classified intent for a query
 */
import { motion } from 'framer-motion';
import {
  BrainCircuit,
  ChevronDown,
  ChevronUp,
  Cpu,
  Sparkles,
  Target,
  Shield,
  Zap,
  Eye,
} from 'lucide-react';
import { useState } from 'react';

// ── Confidence Meter ─────────────────────────────────────────────────────

interface ConfidenceMeterProps {
  value: number; // 0-1
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function ConfidenceMeter({ value, label = 'Confidence', size = 'md' }: ConfidenceMeterProps) {
  const pct = Math.round(value * 100);
  const sizes = {
    sm: { outer: 48, stroke: 4, text: 'text-xs', labelText: 'text-[9px]' },
    md: { outer: 64, stroke: 5, text: 'text-sm', labelText: 'text-[10px]' },
    lg: { outer: 80, stroke: 6, text: 'text-base', labelText: 'text-xs' },
  };
  const s = sizes[size];
  const radius = (s.outer - s.stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (circumference * value);

  const color =
    pct >= 80 ? 'text-emerald-600 stroke-emerald-500' :
    pct >= 50 ? 'text-amber-500 stroke-amber-500' :
    'text-red-500 stroke-red-500';

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: s.outer, height: s.outer }}>
        <svg className="transform -rotate-90" width={s.outer} height={s.outer}>
          <circle
            cx={s.outer / 2}
            cy={s.outer / 2}
            r={radius}
            fill="none"
            className="stroke-border"
            strokeWidth={s.stroke}
          />
          <motion.circle
            cx={s.outer / 2}
            cy={s.outer / 2}
            r={radius}
            fill="none"
            className={color}
            strokeWidth={s.stroke}
            strokeDasharray={circumference}
            strokeLinecap="round"
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </svg>
        <div className={`absolute inset-0 flex items-center justify-center ${s.text} font-bold ${color.split(' ')[0]}`}>
          {pct}%
        </div>
      </div>
      <span className={`${s.labelText} text-muted-foreground`}>{label}</span>
    </div>
  );
}


// ── Model Badge ──────────────────────────────────────────────────────────

const MODEL_COLORS: Record<string, string> = {
  reasoning: 'bg-teal-500/20 text-teal-700 border-teal-500/30',
  explanation: 'bg-cyan-500/20 text-cyan-700 border-cyan-500/30',
  postmortem: 'bg-amber-500/20 text-amber-700 border-amber-500/30',
  summary: 'bg-emerald-500/20 text-emerald-700 border-emerald-500/30',
  intent: 'bg-slate-500/20 text-slate-600 border-slate-500/30',
};

const MODEL_LABELS: Record<string, string> = {
  reasoning: 'Deep Reasoning',
  explanation: 'Explainer',
  postmortem: 'Chain-of-Thought',
  summary: 'Quick Summary',
  intent: 'Intent Classifier',
};

interface ModelBadgeProps {
  taskType: string;
  className?: string;
}

export function ModelBadge({ taskType, className = '' }: ModelBadgeProps) {
  const colorClass = MODEL_COLORS[taskType] || MODEL_COLORS.explanation;
  const label = MODEL_LABELS[taskType] || taskType;

  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-medium border rounded-full px-2.5 py-0.5 ${colorClass} ${className}`}>
      <Cpu className="h-3 w-3" />
      {label}
    </span>
  );
}


// ── Intent Badge ─────────────────────────────────────────────────────────

const INTENT_ICONS: Record<string, React.ReactNode> = {
  risk_analysis: <Shield className="h-3 w-3" />,
  team_query: <Target className="h-3 w-3" />,
  simulation: <Zap className="h-3 w-3" />,
  financial: <Sparkles className="h-3 w-3" />,
  general: <BrainCircuit className="h-3 w-3" />,
};

interface IntentBadgeProps {
  intent: string;
  className?: string;
}

export function IntentBadge({ intent, className = '' }: IntentBadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-muted/50 border border-border rounded-full px-2 py-0.5 ${className}`}>
      {INTENT_ICONS[intent] || <Eye className="h-3 w-3" />}
      {intent.replace('_', ' ')}
    </span>
  );
}


// ── Agent Reasoning Card ─────────────────────────────────────────────────

interface AgentOpinion {
  agent: string;
  claim: string;
  confidence: number;
  evidence: string[];
}

const AGENT_COLORS: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  RiskAgent: { bg: 'bg-red-500/10', text: 'text-red-400', icon: <Shield className="h-4 w-4" /> },
  ConstraintAgent: { bg: 'bg-amber-500/10', text: 'text-amber-400', icon: <Target className="h-4 w-4" /> },
  SimulationAgent: { bg: 'bg-teal-500/10', text: 'text-teal-600', icon: <Zap className="h-4 w-4" /> },
};

interface AgentReasoningCardProps {
  opinions: AgentOpinion[];
  className?: string;
}

export function AgentReasoningCard({ opinions, className = '' }: AgentReasoningCardProps) {
  const [expanded, setExpanded] = useState(false);

  if (!opinions.length) return null;

  return (
    <div className={`rounded-xl border border-border bg-card shadow-sm overflow-hidden ${className}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <BrainCircuit className="h-4 w-4 text-teal-500" />
          <span className="text-sm font-medium text-foreground">Agent Reasoning Chain</span>
          <span className="text-xs text-muted-foreground">({opinions.length} agents)</span>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="border-t border-border divide-y divide-border"
        >
          {opinions.map((op) => {
            const agentStyle = AGENT_COLORS[op.agent] || { bg: 'bg-slate-500/10', text: 'text-slate-400', icon: <Cpu className="h-4 w-4" /> };
            return (
              <div key={op.agent} className="px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`rounded-lg p-1.5 ${agentStyle.bg}`}>
                      {agentStyle.icon}
                    </div>
                    <span className={`text-sm font-medium ${agentStyle.text}`}>{op.agent}</span>
                  </div>
                  <ConfidenceMeter value={op.confidence} size="sm" label="" />
                </div>
                <p className="text-sm text-foreground/80 mb-2">{op.claim}</p>
                <ul className="space-y-1">
                  {op.evidence.map((e, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <span className="text-muted-foreground/50 mt-0.5">•</span>
                      {e}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}


// ── Context Pill ─────────────────────────────────────────────────────────

interface ContextPillProps {
  label: string;
  value: string | number;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

export function ContextPill({ label, value, variant = 'default' }: ContextPillProps) {
  const colors = {
    default: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
    success: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    danger: 'bg-red-500/10 text-red-600 border-red-500/20',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium border rounded-lg px-2.5 py-1 ${colors[variant]}`}>
      <span className="text-muted-foreground">{label}:</span>
      {value}
    </span>
  );
}
