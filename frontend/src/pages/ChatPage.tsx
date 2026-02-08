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
          next[assistantIdx] = { role: 'assistant', content: `⚠️ Error: ${err}` };
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
          <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 shadow-sm">
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
              className="absolute bottom-1.5 right-1.5 h-8 w-8 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 shadow-sm hover:from-violet-500 hover:to-indigo-500 disabled:opacity-40"
            >
              {streaming ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
          <p className="mt-1.5 text-center text-[10px] text-muted-foreground/70">
            Multi-Model AI Router • Graph Agents • Intent Classification
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

const MessageBubble = ({
  message,
  isStreaming,
}: {
  message: ChatMessage;
  isStreaming: boolean;
}) => {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'group flex gap-3 py-3 px-2 rounded-xl transition-colors',
        isUser ? 'justify-end' : 'hover:bg-muted/30',
      )}
    >
      {!isUser && (
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 shadow-sm">
          <Bot className="h-3.5 w-3.5 text-white" />
        </div>
      )}

      <div className={cn('flex flex-col gap-1', isUser ? 'items-end' : 'items-start flex-1 min-w-0')}>
        <div
          className={cn(
            'text-sm leading-relaxed',
            isUser
              ? 'rounded-2xl rounded-br-md bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-white shadow-sm max-w-[80%]'
              : 'text-foreground prose prose-sm dark:prose-invert prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-pre:bg-muted prose-pre:text-foreground prose-code:text-violet-400 prose-code:before:content-none prose-code:after:content-none max-w-none',
          )}
        >
          {message.content ? (
            isUser ? (
              message.content
            ) : (
              <ReactMarkdown>{message.content}</ReactMarkdown>
            )
          ) : (
            isStreaming && (
              <span className="inline-flex items-center gap-2 text-muted-foreground">
                <span className="flex gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-bounce [animation-delay:0ms]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-bounce [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-bounce [animation-delay:300ms]" />
                </span>
                Thinking…
              </span>
            )
          )}
          {isStreaming && message.content && (
            <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-violet-500 rounded-full" />
          )}
        </div>

        {/* Copy button + meta badges for assistant messages */}
        {!isUser && message.content && !isStreaming && (
          <div className="flex items-center gap-2 flex-wrap">
            <CopyButton text={message.content} />
            {message.meta?.task_type && (
              <ModelBadge taskType={message.meta.task_type} />
            )}
            {message.meta?.intent && (
              <IntentBadge intent={message.meta.intent} />
            )}
          </div>
        )}
      </div>

      {isUser && (
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted">
          <User className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
      )}
    </motion.div>
  );
};

const FollowUpSuggestions = ({ onSuggestion }: { onSuggestion: (q: string) => void }) => {
  const followUps = [
    'How can we mitigate these risks?',
    'Break this down into action items',
    'Who should own this work?',
    'Compare with last sprint's metrics',
    'What's the hiring impact here?',
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
      color: 'from-violet-500/10 to-indigo-500/10 text-violet-400',
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
      color: 'from-indigo-500/10 to-purple-500/10 text-indigo-400',
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
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 blur-xl animate-pulse" />
          <div className="relative flex h-full w-full items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg">
            <BrainCircuit className="h-10 w-10 text-white" />
          </div>
        </div>

        <h2 className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
          AI Co-Pilot
        </h2>
        <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
          Powered by a multi-agent AI pipeline with graph-backed analysis.
          Ask complex questions about risks, team dynamics, budgets, hiring, or strategic decisions.
        </p>

        {/* Capability pills */}
        <div className="flex flex-wrap justify-center gap-1.5 mt-4 mb-6">
          {['Risk Analysis', 'Team Simulation', 'Budget Tracking', 'Dependency Mapping', 'Hiring Strategy', 'Sprint Analytics'].map(cap => (
            <span key={cap} className="inline-flex items-center gap-1 rounded-full border border-border/40 bg-muted/30 px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
              <Zap className="h-2.5 w-2.5 text-violet-400" />{cap}
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
