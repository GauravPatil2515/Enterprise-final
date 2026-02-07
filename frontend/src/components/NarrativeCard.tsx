/**
 * NarrativeCard — AI-generated executive briefing for role dashboards.
 * Fetches /api/narrative/{role} and displays it with a loading state,
 * freshness timestamp, and confidence indicator.
 */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { BrainCircuit, RefreshCw, Sparkles, Clock, ShieldCheck } from 'lucide-react';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null);
  const [, setTick] = useState(0); // force re-render for "time ago"

  const fetchNarrative = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getNarrative(role);
      setNarrative(res.narrative);
      setGeneratedAt(new Date());
    } catch (err: any) {
      setError(err?.message || 'Failed to generate narrative');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNarrative();
  }, [role]);

  // Refresh the "time ago" label every 30s
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  // Confidence: "High" if narrative is long (> 200 chars), "Medium" otherwise
  const confidence = narrative.length > 200 ? 'High' : narrative.length > 80 ? 'Medium' : 'Low';
  const confColor = confidence === 'High' ? 'text-emerald-400 bg-emerald-500/15' : confidence === 'Medium' ? 'text-amber-400 bg-amber-500/15' : 'text-red-400 bg-red-500/15';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-xl border bg-gradient-to-r from-violet-500/5 via-indigo-500/5 to-purple-500/5 p-4',
        className,
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 shadow-sm">
            <BrainCircuit className="h-3.5 w-3.5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-1.5">
              AI Intelligence Briefing
              <Sparkles className="h-3 w-3 text-violet-400" />
            </h3>
            <p className="text-[10px] text-muted-foreground">Generated from live graph data</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Confidence badge */}
          {!loading && narrative && (
            <span className={cn('inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full', confColor)}>
              <ShieldCheck className="h-2.5 w-2.5" />
              {confidence}
            </span>
          )}
          {/* Freshness label */}
          {generatedAt && !loading && (
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
              <Clock className="h-2.5 w-2.5" />
              {timeSince(generatedAt)}
            </span>
          )}
          <button
            onClick={fetchNarrative}
            disabled={loading}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn('h-3 w-3', loading && 'animate-spin')} />
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
          <span className="flex gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-bounce [animation-delay:0ms]" />
            <span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-bounce [animation-delay:150ms]" />
            <span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-bounce [animation-delay:300ms]" />
          </span>
          Analyzing organizational data…
        </div>
      ) : error ? (
        <p className="text-sm text-red-400 py-1">{error}</p>
      ) : (
        <div className="text-sm leading-relaxed text-foreground/90 prose prose-sm dark:prose-invert prose-p:my-1 prose-headings:my-2 max-w-none">
          <ReactMarkdown>{narrative}</ReactMarkdown>
        </div>
      )}
    </motion.div>
  );
};

export default NarrativeCard;
