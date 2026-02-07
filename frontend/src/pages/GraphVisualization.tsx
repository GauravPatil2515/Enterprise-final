/**
 * GraphVisualization — Interactive 3D/2D force-directed graph using react-force-graph
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { GitGraph, Box, Layers, Search, Filter, Info, RefreshCw } from 'lucide-react';
import { api } from '@/services/api';
import { cn } from '@/lib/utils';
import ForceGraph2D from 'react-force-graph-2d';
import ForceGraph3D from 'react-force-graph-3d';

// ── Types ──
interface GraphNode {
  id: string;
  label: string;
  name: string;
  props: Record<string, any>;
}

interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  type: string;
}

// ── Color palette per node label ──
const NODE_COLORS: Record<string, string> = {
  Team: '#3b82f6',       // blue-500
  Project: '#8b5cf6',    // purple-500
  Ticket: '#f59e0b',     // amber-500
  Member: '#10b981',     // emerald-500
  SystemUser: '#ec4899', // pink-500
};

const NODE_SIZES: Record<string, number> = {
  Team: 8,
  Project: 6,
  Ticket: 4,
  Member: 5,
  SystemUser: 4,
};

const EDGE_COLORS: Record<string, string> = {
  HAS_PROJECT: '#6366f1',
  HAS_TICKET: '#a855f7',
  ASSIGNED_TO: '#22d3ee',
  MEMBER_OF: '#34d399',
  BLOCKED_BY: '#ef4444',
};

// ── Component ──
const GraphVisualization = () => {
  const [graphData, setGraphData] = useState<{ nodes: GraphNode[]; links: GraphLink[] }>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [is3D, setIs3D] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [highlightNodes, setHighlightNodes] = useState(new Set());
  const [highlightLinks, setHighlightLinks] = useState(new Set());
  const [hoverNode, setHoverNode] = useState<GraphNode | null>(null);
  
  const fgRef = useRef<any>();

  // ── Fetch data ──
  const loadGraph = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getGraphData();
      setGraphData({
        nodes: data.nodes,
        links: data.edges.map((e: any) => ({
          source: e.source,
          target: e.target,
          type: e.type,
        })),
      });
    } catch (e: any) {
      setError(e.message || 'Failed to load graph');
      import('sonner').then(({ toast }) => toast.error(e.message || 'Failed to load graph data'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadGraph(); }, [loadGraph]);

  // ── Filtering ──
  const allTypes = Array.from(new Set(graphData.nodes.map(n => n.label)));
  
  const toggleType = (type: string) => {
    const newSet = new Set(selectedTypes);
    if (newSet.has(type)) {
      newSet.delete(type);
    } else {
      newSet.add(type);
    }
    setSelectedTypes(newSet);
  };

  const filteredData = {
    nodes: graphData.nodes.filter(n => 
      (selectedTypes.size === 0 || selectedTypes.has(n.label)) &&
      (searchTerm === '' || n.name.toLowerCase().includes(searchTerm.toLowerCase()))
    ),
    links: graphData.links.filter(l => {
      const sourceId = typeof l.source === 'string' ? l.source : l.source.id;
      const targetId = typeof l.target === 'string' ? l.target : l.target.id;
      const sourceNode = graphData.nodes.find(n => n.id === sourceId);
      const targetNode = graphData.nodes.find(n => n.id === targetId);
      return (
        sourceNode && targetNode &&
        (selectedTypes.size === 0 || (selectedTypes.has(sourceNode.label) && selectedTypes.has(targetNode.label))) &&
        (searchTerm === '' || 
          sourceNode.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          targetNode.name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }),
  };

  // ── Highlight neighbors ──
  const handleNodeHover = (node: GraphNode | null) => {
    setHoverNode(node);
    if (!node) {
      setHighlightNodes(new Set());
      setHighlightLinks(new Set());
      return;
    }

    const neighbors = new Set();
    const links = new Set();
    
    graphData.links.forEach(link => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target.id;
      
      if (sourceId === node.id) {
        neighbors.add(targetId);
        links.add(link);
      } else if (targetId === node.id) {
        neighbors.add(sourceId);
        links.add(link);
      }
    });
    
    neighbors.add(node.id);
    setHighlightNodes(neighbors);
    setHighlightLinks(links);
  };

  // ── Node styling ──
  const paintNode = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const size = NODE_SIZES[node.label] || 4;
    const color = NODE_COLORS[node.label] || '#666';
    const isHighlighted = highlightNodes.size === 0 || highlightNodes.has(node.id);
    const opacity = isHighlighted ? 1 : 0.2;

    // Node circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
    ctx.fillStyle = color + Math.round(opacity * 255).toString(16).padStart(2, '0');
    ctx.fill();
    
    // Border
    ctx.strokeStyle = isHighlighted ? '#fff' : color;
    ctx.lineWidth = isHighlighted ? 1.5 : 0.5;
    ctx.stroke();

    // Label
    const label = node.name.length > 15 ? node.name.slice(0, 13) + '…' : node.name;
    const fontSize = Math.max(10, 12 / globalScale);
    ctx.font = `${fontSize}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = isHighlighted ? '#e5e7eb' : '#9ca3af';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(label, node.x, node.y + size + 2);
  }, [highlightNodes]);

  // ── Link styling ──
  const paintLink = useCallback((link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const isHighlighted = highlightLinks.size === 0 || highlightLinks.has(link);
    const color = EDGE_COLORS[link.type] || '#555';
    const opacity = isHighlighted ? 0.6 : 0.15;
    const width = link.type === 'BLOCKED_BY' ? 2.5 : 1.5;

    ctx.strokeStyle = color + Math.round(opacity * 255).toString(16).padStart(2, '0');
    ctx.lineWidth = width / globalScale;
    
    if (link.type === 'BLOCKED_BY') {
      ctx.setLineDash([5 / globalScale, 3 / globalScale]);
    } else {
      ctx.setLineDash([]);
    }
  }, [highlightLinks]);

  // ── Stats ──
  const stats = {
    totalNodes: graphData.nodes.length,
    filteredNodes: filteredData.nodes.length,
    totalEdges: graphData.links.length,
    filteredEdges: filteredData.links.length,
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
              <h1 className="text-base font-semibold">Knowledge Graph</h1>
              <span className="rounded-full bg-indigo-500/15 px-2 py-0.5 text-xs font-medium text-indigo-400">
                Neo4j
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.filteredNodes}/{stats.totalNodes} nodes • {stats.filteredEdges}/{stats.totalEdges} edges
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search nodes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 w-48"
            />
          </div>

          {/* 2D/3D Toggle */}
          <button
            onClick={() => setIs3D(!is3D)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
              is3D
                ? "bg-purple-500 text-white"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {is3D ? <Box className="h-3.5 w-3.5" /> : <Layers className="h-3.5 w-3.5" />}
            {is3D ? '3D' : '2D'}
          </button>

          {/* Reload */}
          <button
            onClick={loadGraph}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            title="Reload graph"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main container */}
      <div className="relative flex-1 bg-slate-950 overflow-hidden">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-20 bg-slate-950/80 text-muted-foreground">
            Loading graph…
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center z-20 bg-slate-950/80 text-red-400">
            {error}
          </div>
        )}

        {/* Graph */}
        {!loading && !error && (
          is3D ? (
            <ForceGraph3D
              ref={fgRef}
              graphData={filteredData}
              nodeLabel="name"
              nodeVal={(node: any) => (NODE_SIZES[node.label] || 4) * 2}
              nodeColor={(node: any) => NODE_COLORS[node.label] || '#666'}
              linkColor={(link: any) => EDGE_COLORS[link.type] || '#555'}
              linkWidth={(link: any) => link.type === 'BLOCKED_BY' ? 2 : 1}
              linkDirectionalParticles={2}
              linkDirectionalParticleWidth={2}
              linkDirectionalParticleSpeed={0.005}
              linkDirectionalArrowLength={3.5}
              linkDirectionalArrowRelPos={1}
              onNodeHover={handleNodeHover}
              backgroundColor="rgba(2, 6, 23, 1)"
              nodeThreeObject={undefined}
            />
          ) : (
            <ForceGraph2D
              ref={fgRef}
              graphData={filteredData}
              nodeLabel="name"
              nodeCanvasObject={paintNode}
              linkCanvasObject={paintLink}
              linkDirectionalParticles={(link: any) => highlightLinks.has(link) ? 2 : 0}
              linkDirectionalParticleWidth={2}
              linkDirectionalParticleSpeed={0.005}
              linkDirectionalArrowLength={4}
              linkDirectionalArrowRelPos={1}
              onNodeHover={handleNodeHover}
              backgroundColor="rgba(2, 6, 23, 1)"
              cooldownTicks={100}
              onEngineStop={() => fgRef.current?.zoomToFit(400)}
            />
          )
        )}

        {/* Filter Panel */}
        <div className="absolute left-3 top-3 rounded-xl border bg-card/90 backdrop-blur p-3 text-xs space-y-2 max-w-[200px]">
          <div className="flex items-center gap-2 mb-2">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-semibold text-muted-foreground">Filter by Type</span>
          </div>
          {allTypes.map(type => (
            <button
              key={type}
              onClick={() => toggleType(type)}
              className={cn(
                "flex items-center gap-2 w-full text-left px-2 py-1 rounded transition-colors",
                selectedTypes.size === 0 || selectedTypes.has(type)
                  ? "bg-muted"
                  : "opacity-50 hover:opacity-75"
              )}
            >
              <span
                className="inline-block h-3 w-3 rounded-full shrink-0"
                style={{ backgroundColor: NODE_COLORS[type] || '#666' }}
              />
              <span>{type}</span>
            </button>
          ))}
          {selectedTypes.size > 0 && (
            <button
              onClick={() => setSelectedTypes(new Set())}
              className="text-xs text-primary hover:underline w-full text-left"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Legend */}
        <div className="absolute left-3 bottom-3 rounded-xl border bg-card/90 backdrop-blur p-3 text-xs space-y-2 max-w-[200px]">
          <p className="font-semibold text-muted-foreground mb-1">Edge Types</p>
          {Object.entries(EDGE_COLORS).map(([label, color]) => (
            <div key={label} className="flex items-center gap-2">
              <span className="inline-block h-0.5 w-4 rounded shrink-0" style={{ backgroundColor: color }} />
              <span>{label.replace(/_/g, ' ')}</span>
            </div>
          ))}
        </div>

        {/* Node Info Panel */}
        {hoverNode && (
          <div className="absolute right-3 top-3 rounded-xl border bg-card/90 backdrop-blur p-4 text-xs max-w-[280px] space-y-2">
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-3 w-3 rounded-full shrink-0"
                style={{ backgroundColor: NODE_COLORS[hoverNode.label] || '#666' }}
              />
              <span className="font-bold text-sm">{hoverNode.name}</span>
            </div>
            <div className="text-muted-foreground">
              <span className="inline-block px-1.5 py-0.5 rounded bg-muted text-[10px] font-medium mr-1">
                {hoverNode.label}
              </span>
              <span className="text-[10px]">id: {hoverNode.id}</span>
            </div>
            <div className="space-y-0.5 text-muted-foreground max-h-[240px] overflow-y-auto">
              {Object.entries(hoverNode.props)
                .filter(([k]) => !['id'].includes(k))
                .slice(0, 12)
                .map(([k, v]) => (
                  <div key={k} className="flex gap-1">
                    <span className="text-muted-foreground shrink-0">{k}:</span>
                    <span className="truncate font-medium text-foreground">
                      {typeof v === 'string' && v.length > 40 ? v.slice(0, 38) + '…' : String(v)}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Help hint */}
        <div className="absolute right-3 bottom-3 flex items-center gap-1 text-[10px] text-muted-foreground/50">
          <Info className="h-3 w-3" />
          Hover nodes • {is3D ? 'Drag to rotate' : 'Scroll to zoom'} • Particle flow shows connections
        </div>
      </div>
    </motion.div>
  );
};

export default GraphVisualization;
