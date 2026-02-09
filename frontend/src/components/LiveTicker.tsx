import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    GitCommit,
    AlertCircle,
    CheckCircle2,
    Clock,
    Server,
    Activity,
    Github,
    Trello
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Event {
    id: number;
    source: 'github' | 'sentry' | 'jira' | 'system';
    message: string;
    time: string;
    type: 'info' | 'success' | 'warning' | 'error';
}

const SAMPLE_EVENTS: Omit<Event, 'id' | 'time'>[] = [
    { source: 'github', message: 'feat: add recursive agent reasoning', type: 'success' },
    { source: 'sentry', message: 'RateLimitExceeded: OpenAI API (429)', type: 'warning' },
    { source: 'jira', message: 'STORY-420 moved to QA Review', type: 'info' },
    { source: 'system', message: 'Graph re-indexing completed (1.2s)', type: 'success' },
    { source: 'github', message: 'fix: resolving circular dependency in graph-viz', type: 'info' },
    { source: 'sentry', message: 'ServiceUnavailable: Database connection timeout', type: 'error' },
    { source: 'system', message: 'Auto-scaling: New worker node provisioned', type: 'info' },
    { source: 'jira', message: 'BUG-99 assigned to @sarah_engineer', type: 'info' },
];

export const LiveTicker = () => {
    const [events, setEvents] = useState<Event[]>([]);
    const [nextId, setNextId] = useState(1);

    // Initial population
    useEffect(() => {
        const initialEvents = [{
            id: 0,
            ...SAMPLE_EVENTS[Math.floor(Math.random() * SAMPLE_EVENTS.length)],
            time: 'Live',
        }];
        setEvents(initialEvents);
    }, []);

    // Event Stream Simulation
    useEffect(() => {
        const interval = setInterval(() => {
            const randomEvent = SAMPLE_EVENTS[Math.floor(Math.random() * SAMPLE_EVENTS.length)];
            setEvents([{
                id: nextId,
                ...randomEvent,
                time: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
            }]);
            setNextId(n => n + 1);
        }, 6000); // 6s interval for better readability

        return () => clearInterval(interval);
    }, [nextId]);

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 h-8 flex items-center px-4 overflow-hidden border-border/50">
            <div className="flex items-center gap-4 w-full max-w-[1920px] mx-auto">
                {/* Label */}
                <div className="flex items-center gap-2 shrink-0 border-r pr-4 border-border/50">
                    <div className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap">Live Ops</span>
                </div>

                {/* Ticker Stream */}
                <div className="flex-1 overflow-hidden relative h-8">
                    <AnimatePresence mode="wait">
                        {events.map((event) => {
                            const Icon =
                                event.source === 'github' ? Github :
                                    event.source === 'sentry' ? AlertCircle :
                                        event.source === 'jira' ? Trello :
                                            Server;

                            return (
                                <motion.div
                                    key={event.id}
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    exit={{ y: -20, opacity: 0 }}
                                    transition={{ duration: 0.4, ease: "easeOut" }}
                                    className="absolute inset-0 flex items-center gap-3 text-xs font-mono"
                                >
                                    <span className="text-muted-foreground/60 shrink-0">{event.time}</span>
                                    <div className={cn(
                                        "flex items-center gap-1.5 px-1.5 py-0.5 rounded shrink-0",
                                        event.type === 'error' ? "bg-red-500/10 text-red-500" :
                                            event.type === 'warning' ? "bg-amber-500/10 text-amber-500" :
                                                event.type === 'success' ? "bg-emerald-500/10 text-emerald-500" :
                                                    "bg-blue-500/10 text-blue-500"
                                    )}>
                                        <Icon className="h-3 w-3" />
                                        <span className="uppercase font-bold text-[9px]">{event.source}</span>
                                    </div>
                                    <span className="text-foreground truncate max-w-[400px] lg:max-w-none">{event.message}</span>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>

                {/* System Status Stats */}
                <div className="hidden md:flex items-center gap-6 shrink-0 text-[10px] font-medium text-muted-foreground border-l pl-4 border-border/50">
                    <div className="flex items-center gap-1.5">
                        <Activity className="h-3 w-3 text-emerald-500" />
                        <span>System Healthy</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        <span>Latency: 24ms</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <GitCommit className="h-3 w-3" />
                        <span>v2.4.0-rc1</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
