import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Bot,
  User,
  Loader2,
  Sparkles,
  ChevronDown,
  Trash2,
  FolderKanban,
  Zap,
  BrainCircuit,
  Shield,
  Users,
  Copy,
  Check,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTeams } from '@/context/TeamsContext';
import { ModelBadge, IntentBadge } from '@/components/AITransparency';

const CHAT_STORAGE_KEY = 'deliq_chat_history';
const MAX_STORED_MESSAGES = 50;

// ─── Types ──────────────────────────────────────────────────────────────────

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  meta?: {
    intent?: string;
    task_type?: string;
  };
}

// ─── Streaming fetch helper ─────────────────────────────────────────────────

async function streamChat(
  projectId: string | null,
  messages: ChatMessage[],
  onToken: (token: string) => void,
  onDone: () => void,
  onError: (err: string) => void,
  onMeta?: (meta: { intent: string; task_type: string }) => void,
) {
  try {
    const res = await fetch('/api/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: projectId, messages }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      onError(err.detail || `API Error ${res.status}`);
      return;
    }

    const reader = res.body?.getReader();
    if (!reader) { onError('No readable stream'); return; }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const payload = trimmed.slice(6);
        if (payload === '[DONE]') {
          onDone();
          return;
        }
        if (payload.startsWith('[META]') && onMeta) {
          try {
            const metaData = JSON.parse(payload.slice(6));
            onMeta(metaData);
          } catch { /* ignore parse errors */ }
          continue;
        }
        if (payload.startsWith('[ERROR]')) {
          onError(payload.slice(8));
          return;
        }
        onToken(payload);
      }
    }
    onDone();
  } catch (e: any) {
    onError(e.message || 'Network error');
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

const ChatPage = () => {
  const { state } = useTeams();
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const stored = localStorage.getItem(CHAT_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Persist to localStorage when messages change (skip while streaming)
  useEffect(() => {
    if (!streaming && messages.length > 0) {
      try {
        const toStore = messages.slice(-MAX_STORED_MESSAGES);
        localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(toStore));
      } catch { /* quota exceeded — silently ignore */ }
    }
  }, [messages, streaming]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  // Build flat project list from teams
  const allProjects = state.teams.flatMap((t) =>
    t.projects.map((p) => ({ id: p.id, name: p.name, teamName: t.name })),
  );

  const selectedProjectName =
    allProjects.find((p) => p.id === selectedProject)?.name || 'All Projects';

  // ── Send ──────────────────────────────────────────────────────────────────

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setStreaming(true);

    // Reset textarea height
    if (inputRef.current) inputRef.current.style.height = 'auto';

    // Add a placeholder assistant message that we'll stream into
    const assistantIdx = updatedMessages.length;
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

    streamChat(
      selectedProject,
      updatedMessages,
      (token) => {
        setMessages((prev) => {
          const next = [...prev];
          next[assistantIdx] = {
            ...next[assistantIdx],
            content: next[assistantIdx].content + token,
          };
          return next;
        });
      },
      () => setStreaming(false),
      (err) => {
        setMessages((prev) => {
          const next = [...prev];
          next[assistantIdx] = { role: 'assistant', content: `Error: ${err}` };
          return next;
        });
        setStreaming(false);
      },
      (meta) => {
        setMessages((prev) => {
          const next = [...prev];
          next[assistantIdx] = {
            ...next[assistantIdx],
            meta: { intent: meta.intent, task_type: meta.task_type },
          };
          return next;
        });
      },
    );
  }, [input, streaming, messages, selectedProject]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem(CHAT_STORAGE_KEY);
    inputRef.current?.focus();
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col bg-gradient-to-b from-background via-background to-muted/20">
      {/* ── Compact header bar ── */}
      <div className="flex items-center justify-between border-b border-border/60 bg-background/70 backdrop-blur-md px-5 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 shadow-sm">
            <BrainCircuit className="h-4 w-4 text-white" />
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-background" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold">AI Co-Pilot</h1>
              <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-500">
                LIVE
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">Graph-powered intelligence</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Project selector */}
          <div className="relative">
            <button
              onClick={() => setProjectMenuOpen(!projectMenuOpen)}
              className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-muted/40 px-2.5 py-1.5 text-xs transition-colors hover:bg-muted"
            >
              <FolderKanban className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="max-w-[140px] truncate">{selectedProjectName}</span>
              <ChevronDown className={cn("h-3 w-3 text-muted-foreground transition-transform", projectMenuOpen && "rotate-180")} />
            </button>

            <AnimatePresence>
              {projectMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full z-50 mt-1.5 w-60 rounded-xl border border-border/60 bg-card/95 backdrop-blur-lg shadow-xl"
                >
                  <div className="p-1">
                    <button
                      onClick={() => { setSelectedProject(null); setProjectMenuOpen(false); }}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs transition-colors hover:bg-accent',
                        !selectedProject && 'bg-accent font-medium',
                      )}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      All Projects
                    </button>
                    <div className="my-1 border-t border-border/40" />
                    {allProjects.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => { setSelectedProject(p.id); setProjectMenuOpen(false); }}
                        className={cn(
                          'flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs transition-colors hover:bg-accent',
                          selectedProject === p.id && 'bg-accent font-medium',
                        )}
                      >
                        <span className="truncate">{p.name}</span>
                        <span className="text-[10px] text-muted-foreground">{p.teamName}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Clear */}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearChat}
            disabled={messages.length === 0}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* ── Messages area ── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin">
        {messages.length === 0 ? (
          <EmptyState onSuggestion={(q) => { setInput(q); inputRef.current?.focus(); }} />
        ) : (
          <div className="mx-auto max-w-2xl space-y-1 px-4 py-6">
            {messages.map((msg, i) => (
              <MessageBubble key={i} message={msg} isStreaming={streaming && i === messages.length - 1} />
            ))}
            {/* Follow-up suggestions after last assistant response */}
            {!streaming && messages.length > 0 && messages[messages.length - 1].role === 'assistant' && messages[messages.length - 1].content && (
              <FollowUpSuggestions onSuggestion={(q) => { setInput(q); setTimeout(() => inputRef.current?.focus(), 50); }} />
            )}
          </div>
        )}
      </div>

      {/* ── Input area ── */}
      <div className="border-t border-border/50 bg-background/80 backdrop-blur-md px-4 py-3">
        <div className="mx-auto max-w-2xl">
          <div className="relative flex items-end rounded-xl border border-border/60 bg-card shadow-sm transition-all focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/10">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                selectedProject
                  ? `Ask about ${selectedProjectName}…`
                  : 'Ask about risks, team health, decisions…'
              }
              rows={1}
              className="w-full resize-none bg-transparent px-4 py-3 pr-14 text-sm placeholder:text-muted-foreground focus:outline-none"
              style={{ maxHeight: '120px' }}
              onInput={(e) => {
                const t = e.currentTarget;
                t.style.height = 'auto';
                t.style.height = Math.min(t.scrollHeight, 120) + 'px';
              }}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || streaming}
              size="icon"
              className="absolute bottom-1.5 right-1.5 h-8 w-8 rounded-lg bg-gradient-to-r from-teal-600 to-emerald-600 shadow-sm hover:from-teal-500 hover:to-emerald-500 disabled:opacity-40"
            >
              {streaming ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
          <p className="mt-1.5 text-center text-[10px] text-muted-foreground/70 flex items-center justify-center gap-2">
            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            DeepSeek-V3 • Qwen 2.5 • Enterprise Graph
          </p>
        </div>
      </div>
    </div>
  );
};

// ─── Sub-components ─────────────────────────────────────────────────────────

const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground p-1 rounded"
    >
      {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
    </button>
  );
};

// ─── Thinking Component ─────────────────────────────────────────────────────

const ThinkingProcess = () => {
  const [step, setStep] = useState(0);
  const steps = [
    "Analyzing graph topology...",
    "Querying DeepSeek-V3 reasoning engine...",
    "Retrieving risk signals from Neo4j...",
    "Synthesizing multi-agent consensus...",
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((s) => (s + 1) % steps.length);
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="flex items-center gap-3 p-4 rounded-xl bg-muted/40 border border-border/50 max-w-md"
    >
      <div className="relative flex h-8 w-8 items-center justify-center">
        <div className="absolute inset-0 rounded-full border-2 border-teal-500/20 border-t-teal-500 animate-spin" />
        <BrainCircuit className="h-4 w-4 text-teal-500" />
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-semibold text-foreground">AI Co-Pilot is thinking</span>
        <AnimatePresence mode="wait">
          <motion.span
            key={step}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="text-[10px] text-muted-foreground"
          >
            {steps[step]}
          </motion.span>
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

// ─── Message Bubble ─────────────────────────────────────────────────────────

const MessageBubble = ({
  message,
  isStreaming,
}: {
  message: ChatMessage;
  isStreaming: boolean;
}) => {
  const isUser = message.role === 'user';
  const isThinking = isStreaming && !message.content;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'group flex gap-4',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar */}
      <div className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg shadow-sm border",
        isUser ? "bg-muted border-border" : "bg-gradient-to-br from-teal-600 to-emerald-600 border-transparent"
      )}>
        {isUser ? <User className="h-4 w-4 text-muted-foreground" /> : <Bot className="h-4 w-4 text-white" />}
      </div>

      {/* Content */}
      <div className={cn("flex flex-col gap-2 max-w-[85%]", isUser ? "items-end" : "items-start")}>

        {/* Thinking State */}
        {isThinking && <ThinkingProcess />}

        {/* Message Content */}
        {message.content && (
          <div className={cn(
            "relative px-5 py-3.5 text-sm leading-relaxed shadow-sm",
            isUser
              ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-sm"
              : "bg-card border border-border/50 text-card-foreground rounded-2xl rounded-tl-sm"
          )}>
            {isUser ? (
              message.content
            ) : (
              <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-normal prose-headings:font-semibold prose-a:text-teal-600">
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </div>
            )}

            {/* Streaming Cursor */}
            {isStreaming && message.content && (
              <span className="inline-block w-1.5 h-3.5 bg-teal-500 ml-1 animate-pulse align-middle" />
            )}
          </div>
        )}

        {/* Metadata Footer (AI Only) */}
        {!isUser && !isThinking && message.content && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 mt-1 px-1"
          >
            {message.meta?.intent && (
              <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-muted-foreground/70 bg-muted/50 px-1.5 py-0.5 rounded-md border border-border/50">
                <Zap className="h-3 w-3 text-amber-500" />
                {message.meta.intent}
              </span>
            )}
            {message.meta?.task_type && (
              <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-muted-foreground/70 bg-muted/50 px-1.5 py-0.5 rounded-md border border-border/50">
                <BrainCircuit className="h-3 w-3 text-teal-500" />
                {message.meta.task_type}
              </span>
            )}
            <div className="grow" />
            <CopyButton text={message.content} />
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};



const FollowUpSuggestions = ({ onSuggestion }: { onSuggestion: (q: string) => void }) => {
  const followUps = [
    'How can we mitigate these risks?',
    'Break this down into action items',
    'Who should own this work?',
    "Compare with last sprint's metrics",
    "What's the hiring impact here?",
    'Generate a stakeholder summary',
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.3 }}
      className="mx-auto max-w-2xl px-4 pb-2"
    >
      <p className="text-[10px] font-medium text-muted-foreground mb-1.5 ml-10">Suggested follow-ups</p>
      <div className="flex flex-wrap gap-1.5 ml-10">
        {followUps.map((q) => (
          <button
            key={q}
            onClick={() => onSuggestion(q)}
            className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-card/60 px-3 py-1.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-card hover:border-primary/30 transition-all"
          >
            <Sparkles className="h-2.5 w-2.5" />
            {q}
          </button>
        ))}
      </div>
    </motion.div>
  );
};

const EmptyState = ({ onSuggestion }: { onSuggestion: (q: string) => void }) => {
  const suggestions = [
    {
      icon: <Shield className="h-4 w-4" />,
      label: 'Risk Analysis',
      query: 'What are the top risks across all projects? Include severity levels and mitigation strategies.',
      color: 'from-red-500/10 to-orange-500/10 text-red-400',
    },
    {
      icon: <Zap className="h-4 w-4" />,
      label: 'Blockers & Dependencies',
      query: 'Which tickets are currently blocked or blocking others? Show dependency chains.',
      color: 'from-amber-500/10 to-yellow-500/10 text-amber-400',
    },
    {
      icon: <Users className="h-4 w-4" />,
      label: 'Team Health & Velocity',
      query: 'Analyze team health metrics: velocity, workload balance, and burnout risk across all teams.',
      color: 'from-emerald-500/10 to-green-500/10 text-emerald-400',
    },
    {
      icon: <BrainCircuit className="h-4 w-4" />,
      label: 'Sprint Planning',
      query: 'What should we prioritize this sprint? Consider deadlines, dependencies, and team capacity.',
      color: 'from-teal-500/10 to-emerald-500/10 text-teal-500',
    },
    {
      icon: <FolderKanban className="h-4 w-4" />,
      label: 'Resource Allocation',
      query: 'Analyze resource allocation. Which engineers are over-committed and who has bandwidth?',
      color: 'from-cyan-500/10 to-blue-500/10 text-cyan-400',
    },
    {
      icon: <Bot className="h-4 w-4" />,
      label: 'Cost vs Progress',
      query: 'Compare project cost burn rate against completion percentage. Flag projects with poor ROI.',
      color: 'from-pink-500/10 to-rose-500/10 text-pink-400',
    },
    {
      icon: <Sparkles className="h-4 w-4" />,
      label: 'Hiring Recommendation',
      query: 'Based on current workload, what roles should we hire for next? Rank by urgency.',
      color: 'from-orange-500/10 to-amber-500/10 text-orange-400',
    },
    {
      icon: <Shield className="h-4 w-4" />,
      label: 'Executive Summary',
      query: 'Generate an executive summary for the chairperson covering all teams, budgets, risks, and milestones.',
      color: 'from-teal-500/10 to-cyan-500/10 text-teal-600',
    },
  ];

  return (
    <div className="flex h-full flex-col items-center justify-center px-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="text-center max-w-2xl"
      >
        {/* Animated logo */}
        <div className="relative mx-auto mb-6 h-20 w-20">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-teal-500/20 to-emerald-500/20 blur-xl animate-pulse" />
          <div className="relative flex h-full w-full items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 shadow-lg">
            <BrainCircuit className="h-10 w-10 text-white" />
          </div>
        </div>

        <h2 className="text-2xl font-bold bg-gradient-to-r from-teal-500 to-emerald-500 bg-clip-text text-transparent">
          AI Co-Pilot
        </h2>
        <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
          Powered by <strong>DeepSeek-V3</strong> & <strong>Qwen 2.5</strong> with graph-backed analysis.
          Ask complex questions about risks, team dynamics, budgets, hiring, or strategic decisions.
        </p>

        {/* Capability pills */}
        <div className="flex flex-wrap justify-center gap-1.5 mt-4 mb-6">
          {['Risk Analysis', 'Team Simulation', 'Budget Tracking', 'Dependency Mapping', 'Hiring Strategy', 'Sprint Analytics'].map(cap => (
            <span key={cap} className="inline-flex items-center gap-1 rounded-full border border-border/40 bg-muted/30 px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
              <Zap className="h-2.5 w-2.5 text-teal-500" />{cap}
            </span>
          ))}
        </div>

        {/* Suggestion cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {suggestions.map((s) => (
            <button
              key={s.label}
              onClick={() => onSuggestion(s.query)}
              className="group relative rounded-xl border border-border/50 bg-card/50 p-3 text-left transition-all hover:border-primary/30 hover:bg-card hover:shadow-md"
            >
              <div className={cn(
                'inline-flex items-center justify-center rounded-lg bg-gradient-to-br p-2 mb-2',
                s.color,
              )}>
                {s.icon}
              </div>
              <p className="text-xs font-medium">{s.label}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{s.query}</p>
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default ChatPage;
