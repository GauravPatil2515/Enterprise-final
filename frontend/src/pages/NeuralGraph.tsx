/**
 * NeuralGraph — Enterprise Intelligence Visualization
 * 
 * Embeds the graph-viz neural network visualization via iframe.
 * This runs on a separate Flask+Vite stack with its own Neo4j database,
 * keeping it isolated from the main project's data layer.
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Network,
    ExternalLink,
    RefreshCw,
    Maximize2,
    Minimize2,
    AlertCircle,
    Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const GRAPH_VIZ_URL = 'http://localhost:5174';

export default function NeuralGraph() {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    const handleIframeLoad = () => {
        setIsLoading(false);
        setHasError(false);
    };

    const handleIframeError = () => {
        setIsLoading(false);
        setHasError(true);
    };

    const refreshIframe = () => {
        setIsLoading(true);
        setHasError(false);
        const iframe = document.getElementById('neural-graph-iframe') as HTMLIFrameElement;
        if (iframe) {
            iframe.src = iframe.src;
        }
    };

    const toggleFullscreen = () => {
        setIsFullscreen(!isFullscreen);
    };

    const openInNewTab = () => {
        window.open(GRAPH_VIZ_URL, '_blank');
    };

    if (isFullscreen) {
        return (
            <div className="fixed inset-0 z-50 bg-gray-900">
                <div className="absolute top-4 right-4 z-10 flex gap-2">
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={toggleFullscreen}
                        className="bg-gray-800 hover:bg-gray-700 text-white border-gray-700"
                    >
                        <Minimize2 className="h-4 w-4 mr-1" />
                        Exit Fullscreen
                    </Button>
                </div>
                <iframe
                    id="neural-graph-iframe"
                    src={GRAPH_VIZ_URL}
                    className="w-full h-full border-0"
                    title="Enterprise Neural Graph"
                    onLoad={handleIframeLoad}
                    onError={handleIframeError}
                />
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-3.5rem)] flex flex-col bg-background">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between border-b border-border px-6 py-3 bg-card"
            >
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600 text-white shadow-sm">
                        <Network className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-lg font-semibold">Enterprise Neural Graph</h1>
                        <p className="text-xs text-muted-foreground">
                            AI-Driven Workforce Analytics • Separate Database Instance
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={refreshIframe}
                        disabled={isLoading}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={toggleFullscreen}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        <Maximize2 className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={openInNewTab}
                        className="gap-1.5"
                    >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Open Standalone
                    </Button>
                </div>
            </motion.div>

            {/* Content */}
            <div className="flex-1 relative">
                {/* Loading State */}
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
                        <div className="text-center">
                            <Loader2 className="h-8 w-8 animate-spin text-teal-500 mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground">Loading Neural Graph...</p>
                            <p className="text-xs text-muted-foreground/60 mt-1">
                                Connecting to visualization server on port 5174
                            </p>
                        </div>
                    </div>
                )}

                {/* Error State */}
                {hasError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
                        <div className="text-center max-w-md px-6">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600 mx-auto mb-4">
                                <AlertCircle className="h-6 w-6" />
                            </div>
                            <h3 className="font-semibold text-lg mb-2">Visualization Server Not Running</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                The Neural Graph visualization requires a separate server. Start it with:
                            </p>
                            <div className="bg-muted rounded-lg p-3 text-left font-mono text-xs mb-4">
                                <p className="text-muted-foreground mb-1"># Navigate to graph-viz folder</p>
                                <p>cd graph-viz</p>
                                <p className="text-muted-foreground mt-2 mb-1"># Start the visualization</p>
                                <p>start_viz.bat</p>
                            </div>
                            <Button onClick={refreshIframe} variant="outline" size="sm">
                                <RefreshCw className="h-4 w-4 mr-1.5" />
                                Retry Connection
                            </Button>
                        </div>
                    </div>
                )}

                {/* Iframe */}
                <iframe
                    id="neural-graph-iframe"
                    src={GRAPH_VIZ_URL}
                    className="w-full h-full border-0"
                    title="Enterprise Neural Graph"
                    onLoad={handleIframeLoad}
                    onError={handleIframeError}
                    style={{ display: hasError ? 'none' : 'block' }}
                />
            </div>
        </div>
    );
}
