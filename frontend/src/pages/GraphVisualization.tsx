/**
 * GraphVisualization — Embeds the standalone graph-viz application
 * 
 * This page loads the graph-viz app (running on localhost:5173 via start_viz.bat)
 * into an iframe, keeping it completely separate from the Enterprise database.
 */
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { GitGraph, AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';

const GraphVisualization = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const GRAPH_VIZ_URL = 'http://localhost:5173';

  useEffect(() => {
    // Check if graph-viz is running
    const checkServer = async () => {
      try {
        const response = await fetch(GRAPH_VIZ_URL, { mode: 'no-cors' });
        setIsLoading(false);
        setHasError(false);
      } catch (e) {
        setIsLoading(false);
        setHasError(true);
      }
    };

    checkServer();
  }, []);

  const handleReload = () => {
    setIsLoading(true);
    setHasError(false);
    window.location.reload();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-[calc(100vh-3.5rem)]"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border/60 bg-background/70 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 shadow-sm">
            <GitGraph className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">Neural Knowledge Graph</h1>
              <span className="rounded-full bg-indigo-500/15 px-2 py-0.5 text-xs font-medium text-indigo-400">
                Graph-Viz
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Advanced workforce intelligence visualization
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleReload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors bg-muted text-muted-foreground hover:text-foreground"
            title="Reload visualization"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reload
          </button>
          
          <a
            href={GRAPH_VIZ_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open in New Tab
          </a>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative flex-1 bg-slate-950 overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-20 bg-slate-950/80">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">Loading Graph Visualization...</p>
            </div>
          </div>
        )}

        {hasError && (
          <div className="absolute inset-0 flex items-center justify-center z-20 bg-slate-950">
            <div className="max-w-md text-center space-y-4 p-6">
              <div className="flex justify-center">
                <div className="rounded-full bg-red-500/10 p-3">
                  <AlertCircle className="h-8 w-8 text-red-500" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Graph Visualization Not Running</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  The graph-viz server is not accessible. Please ensure it's running by executing:
                </p>
                <code className="block bg-muted px-4 py-2 rounded-lg text-xs font-mono text-left">
                  start_viz.bat
                </code>
              </div>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={handleReload}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Retry Connection
                </button>
                <a
                  href={GRAPH_VIZ_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-muted text-foreground hover:bg-muted/80 transition-colors"
                >
                  Open Directly
                </a>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                Expected URL: <span className="font-mono text-primary">{GRAPH_VIZ_URL}</span>
              </p>
            </div>
          </div>
        )}

        {/* Iframe */}
        {!hasError && (
          <iframe
            src={GRAPH_VIZ_URL}
            className="w-full h-full border-0"
            title="Graph Visualization"
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setHasError(true);
            }}
            allow="fullscreen"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
          />
        )}
      </div>
    </motion.div>
  );
};

export default GraphVisualization;
