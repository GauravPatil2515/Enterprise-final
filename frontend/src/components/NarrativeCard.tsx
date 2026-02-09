/**
 * NarrativeCard — AI-generated executive briefing for role dashboards.
 * Shows a "Generate Briefing" button on first load, then displays the
 * full Markdown briefing with confidence and freshness indicators.
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { BrainCircuit, RefreshCw, Sparkles, Clock, ShieldCheck, Zap, FileText, AlertTriangle } from 'lucide-react';
import { api } from '@/services/api';
import { cn } from '@/lib/utils';

interface Props {
  role: string;
  className?: string;
}

function timeSince(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

const NarrativeCard = ({ role, className }: Props) => {
  const [narrative, setNarrative] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [, setTick] = useState(0);

  const fetchNarrative = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    setError('');
    try {
      const res = await api.getNarrative(role);
      setNarrative(res.narrative);
      setGeneratedAt(new Date());
      setHasGenerated(true);
    } catch (err: any) {
      if (!isBackground) setError(err?.message || 'Failed to generate narrative');
    } finally {
      setLoading(false);
    }
  };

  // Poll every 30s if generated
  useEffect(() => {
    if (!hasGenerated) return;
    const interval = setInterval(() => {
      fetchNarrative(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [hasGenerated]);

  // Refresh the "time ago" label every 10s
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 10000);
    return () => clearInterval(interval);
  }, []);

  const confidence = narrative.length > 400 ? 'High' : narrative.length > 150 ? 'Medium' : 'Low';
  const confColor = confidence === 'High' ? 'text-emerald-400 bg-emerald-500/15' : confidence === 'Medium' ? 'text-amber-400 bg-amber-500/15' : 'text-red-400 bg-red-500/15';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-xl border bg-gradient-to-r from-teal-500/5 via-emerald-500/5 to-cyan-500/5 overflow-hidden',
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 shadow-sm relative">
            <BrainCircuit className="h-4 w-4 text-white" />
            {hasGenerated && (
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-1.5">
              AI Intelligence Briefing
              <Sparkles className="h-3 w-3 text-teal-500" />
            </h3>
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              {hasGenerated ? (
                <span className="text-emerald-600 font-medium flex items-center gap-1">
                  • Live Monitoring
                </span>
              ) : (
                'Click generate to analyze live data'
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!loading && narrative && (
            <span className={cn('inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full', confColor)}>
              <ShieldCheck className="h-2.5 w-2.5" />
              {confidence}
            </span>
          )}
          {generatedAt && !loading && (
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
              <Clock className="h-2.5 w-2.5" />
              {timeSince(generatedAt)}
            </span>
          )}
          {hasGenerated && (
            <button
              onClick={() => fetchNarrative(false)}
              disabled={loading}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn('h-3 w-3', loading && 'animate-spin')} />
              Refresh
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-3">
        <AnimatePresence mode="wait">
          {!hasGenerated && !loading && (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center py-6 gap-4"
            >
              <div className="relative">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-teal-500/15 to-emerald-500/15 blur-xl" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500/10 to-emerald-500/10 border border-teal-500/20">
                  <FileText className="h-8 w-8 text-teal-500" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground/80">Ready to generate your briefing</p>
                <p className="text-xs text-muted-foreground mt-1">
                  AI will analyze live organizational data and produce<br />
                  actionable insights tailored to your {role} role
                </p>
              </div>
              <button
                onClick={() => fetchNarrative(false)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md hover:from-teal-500 hover:to-emerald-500 transition-all hover:shadow-lg active:scale-[0.98]"
              >
                <Zap className="h-4 w-4" />
                Generate Intelligence Briefing
              </button>
            </motion.div>
          )}

          {loading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center py-8 gap-3"
            >
              <div className="relative h-12 w-12">
                <div className="absolute inset-0 rounded-full bg-teal-500/20 animate-ping" />
                <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-emerald-600">
                  <BrainCircuit className="h-6 w-6 text-white animate-pulse" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">Analyzing organizational data…</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Querying knowledge graph • Running AI analysis • Generating insights
                </p>
              </div>
              <div className="flex gap-1 mt-1">
                <span className="h-1.5 w-1.5 rounded-full bg-teal-500 animate-bounce [animation-delay:0ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-teal-500 animate-bounce [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-teal-500 animate-bounce [animation-delay:300ms]" />
              </div>
            </motion.div>
          )}

          {error && !loading && (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center py-4 gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <p className="text-sm text-red-400 text-center">{error}</p>
              <button onClick={() => fetchNarrative(false)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                <RefreshCw className="h-3.5 w-3.5" /> Try again
              </button>
            </motion.div>
          )}

          {!loading && !error && narrative && (
            <motion.div
              key="content"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-sm leading-relaxed text-foreground/90 prose prose-sm dark:prose-invert prose-p:my-1.5 prose-headings:my-3 prose-headings:text-foreground prose-ul:my-1 prose-li:my-0.5 prose-h2:text-base prose-h2:font-bold prose-strong:text-foreground max-w-none max-h-[500px] overflow-y-auto scrollbar-thin"
            >
              <ReactMarkdown>{narrative}</ReactMarkdown>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default NarrativeCard;
