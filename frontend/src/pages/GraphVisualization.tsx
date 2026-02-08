/**
 * GraphVisualization — 3D Neural Knowledge Graph
 *
 * Full-screen force-directed 3D graph of teams ↔ members ↔ projects
 * with glowing nodes, animated particle links, click-to-inspect panel,
 * filter chips, fullscreen mode, and AI-powered skill/person search.
 */
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ForceGraph3D from "react-force-graph-3d";
import * as THREE from "three";
import {
  GitGraph, RefreshCw, Loader2, Users, Briefcase, Network,
  X, Maximize2, Minimize2, ChevronRight, Eye, EyeOff, Zap,
  Search, Sparkles, Target, UserCheck,
} from "lucide-react";

/* ── types ── */
interface RawNode {
  id: string;
  label: string;
  type: "team" | "member" | "project" | "skill";
  properties?: Record<string, any>;
}
interface RawEdge { source: string; target: string; type: string; }
interface RawGraph { nodes: RawNode[]; edges: RawEdge[]; }
interface FGNode extends RawNode {
  x?: number; y?: number; z?: number;
  color?: string; val?: number;
}
interface FGEdge { source: string | FGNode; target: string | FGNode; type: string; color?: string; }

interface SearchResult {
  nodeId: string;
  label: string;
  type: string;
  score: number;
  matchReason: string;
}

/* ── palette ── */
const COLORS: Record<string, { main: string; glow: string; hex: number }> = {
  team:    { main: "#3b82f6", glow: "#60a5fa", hex: 0x3b82f6 },
  member:  { main: "#22c55e", glow: "#4ade80", hex: 0x22c55e },
  project: { main: "#a855f7", glow: "#c084fc", hex: 0xa855f7 },
  skill:   { main: "#f97316", glow: "#fb923c", hex: 0xf97316 },
};
const EDGE_COLORS: Record<string, string> = {
  MEMBER_OF: "rgba(59,130,246,0.4)",
  HAS_PROJECT: "rgba(168,85,247,0.4)",
  WORKS_ON: "rgba(34,197,94,0.3)",
  DEFAULT: "rgba(100,116,139,0.2)",
};
const NODE_SIZES: Record<string, number> = { team: 20, project: 15, member: 9, skill: 7 };

/* ── local skill-based search engine ── */
function searchGraph(query: string, data: RawGraph): SearchResult[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase().trim();
  const terms = q.split(/\s+/);
  const results: SearchResult[] = [];

  for (const node of data.nodes) {
    let score = 0;
    let matchReason = "";

    // Exact name match
    if (node.label.toLowerCase().includes(q)) {
      score += 100;
      matchReason = `Name matches "${q}"`;
    }

    // Skill match via properties
    const skills: string[] = [];
    if (node.properties) {
      const raw = node.properties.skills || node.properties.skill || node.properties.expertise || node.properties.technologies || "";
      if (typeof raw === "string") skills.push(...raw.toLowerCase().split(/[,;|]+/).map(s => s.trim()));
      if (Array.isArray(raw)) skills.push(...raw.map((s: any) => String(s).toLowerCase()));
      // Also check role
      if (node.properties.role) skills.push(node.properties.role.toLowerCase());
      if (node.properties.tech_stack) {
        const ts = node.properties.tech_stack;
        if (typeof ts === "string") skills.push(...ts.toLowerCase().split(/[,;|]+/).map(s => s.trim()));
        if (Array.isArray(ts)) skills.push(...ts.map((s: any) => String(s).toLowerCase()));
      }
    }

    for (const term of terms) {
      for (const s of skills) {
        if (s.includes(term)) {
          score += 80;
          matchReason = matchReason || `Skills: ${skills.filter(sk => sk.includes(term)).join(", ")}`;
        }
      }
    }

    // Partial name/label match per term
    for (const term of terms) {
      if (term.length >= 2 && node.label.toLowerCase().includes(term) && !matchReason) {
        score += 30;
        matchReason = `Partial match on "${term}"`;
      }
    }

    // Project tech match (check project names for tech keywords)
    if (node.type === "project") {
      for (const term of terms) {
        if (node.label.toLowerCase().includes(term)) {
          score += 60;
          matchReason = matchReason || `Project involves "${term}"`;
        }
      }
    }

    if (score > 0) {
      results.push({ nodeId: node.id, label: node.label, type: node.type, score, matchReason });
    }
  }

  // Also find members connected to matching projects/skills
  const directIds = new Set(results.map(r => r.nodeId));
  for (const edge of data.edges) {
    if (directIds.has(edge.target)) {
      const srcNode = data.nodes.find(n => n.id === edge.source);
      if (srcNode && srcNode.type === "member" && !directIds.has(srcNode.id)) {
        results.push({
          nodeId: srcNode.id,
          label: srcNode.label,
          type: "member",
          score: 40,
          matchReason: `Connected to matching ${edge.type.replace(/_/g, " ").toLowerCase()}`,
        });
        directIds.add(srcNode.id);
      }
    }
    if (directIds.has(edge.source)) {
      const tgtNode = data.nodes.find(n => n.id === edge.target);
      if (tgtNode && tgtNode.type === "member" && !directIds.has(tgtNode.id)) {
        results.push({
          nodeId: tgtNode.id,
          label: tgtNode.label,
          type: "member",
          score: 40,
          matchReason: `Connected to matching ${edge.type.replace(/_/g, " ").toLowerCase()}`,
        });
        directIds.add(tgtNode.id);
      }
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, 15);
}

/* ================================================================ */
const GraphVisualization = () => {
  const fgRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [rawData, setRawData] = useState<RawGraph | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<FGNode | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const [filter, setFilter] = useState("all");
  const [dimensions, setDimensions] = useState({ w: 800, h: 600 });

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());
  const searchInputRef = useRef<HTMLInputElement>(null);

  /* ── resize observer ── */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setDimensions({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* ── fetch ── */
  const fetchGraphData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/graph/knowledge");
      if (!res.ok) throw new Error("Backend returned " + res.status);
      setRawData(await res.json());
    } catch (e: any) {
      setError(e.message ?? "Failed to load graph data");
    } finally {
      setIsLoading(false);
    }
  }, []);
  useEffect(() => { fetchGraphData(); }, [fetchGraphData]);

  /* ── search handler ── */
  useEffect(() => {
    if (!rawData || !searchQuery.trim()) {
      setSearchResults([]);
      setHighlightedIds(new Set());
      return;
    }
    const timer = setTimeout(() => {
      const results = searchGraph(searchQuery, rawData);
      setSearchResults(results);
      setHighlightedIds(new Set(results.map(r => r.nodeId)));
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery, rawData]);

  /* ── fly to a search result ── */
  const flyToNode = useCallback((nodeId: string) => {
    if (!rawData || !fgRef.current) return;
    const gd = fgRef.current.graphData();
    const node = gd.nodes.find((n: FGNode) => n.id === nodeId);
    if (!node) return;
    setSelected(node);
    const d = 100;
    fgRef.current.cameraPosition(
      { x: (node.x ?? 0) + d * 0.6, y: (node.y ?? 0) + d * 0.5, z: (node.z ?? 0) + d },
      { x: node.x, y: node.y, z: node.z }, 1000,
    );
  }, [rawData]);

  /* ── build graph data ── */
  const graphData = useMemo(() => {
    if (!rawData) return { nodes: [] as FGNode[], links: [] as FGEdge[] };
    let nodes = rawData.nodes.map<FGNode>(n => ({
      ...n,
      color: COLORS[n.type]?.main ?? "#64748b",
      val: NODE_SIZES[n.type] ?? 8,
    }));
    if (filter !== "all") {
      const ids = new Set(nodes.filter(n => n.type === filter).map(n => n.id));
      const connected = new Set<string>();
      rawData.edges.forEach(e => {
        if (ids.has(e.source)) connected.add(e.target);
        if (ids.has(e.target)) connected.add(e.source);
      });
      const keep = new Set([...ids, ...connected]);
      nodes = nodes.filter(n => keep.has(n.id));
    }
    const nodeIds = new Set(nodes.map(n => n.id));
    const links: FGEdge[] = rawData.edges
      .filter(e => nodeIds.has(e.source) && nodeIds.has(e.target))
      .map(e => ({ source: e.source, target: e.target, type: e.type, color: EDGE_COLORS[e.type] ?? EDGE_COLORS.DEFAULT }));
    return { nodes, links };
  }, [rawData, filter]);

  /* ── custom 3-D node objects ── */
  const nodeThreeObject = useCallback((node: FGNode) => {
    const p = COLORS[node.type] ?? COLORS.member;
    const isHighlighted = highlightedIds.size > 0 && highlightedIds.has(node.id);
    const isDimmed = highlightedIds.size > 0 && !highlightedIds.has(node.id);
    const r = (NODE_SIZES[node.type] ?? 8) * (isHighlighted ? 0.52 : 0.38);
    const group = new THREE.Group();

    // core sphere
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(r, 32, 32),
      new THREE.MeshPhongMaterial({
        color: p.hex,
        emissive: p.hex,
        emissiveIntensity: isHighlighted ? 0.9 : isDimmed ? 0.15 : 0.55,
        transparent: true,
        opacity: isDimmed ? 0.25 : 0.92,
        shininess: 90,
      }),
    );
    group.add(sphere);

    // outer glow shell
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(r * (isHighlighted ? 2.0 : 1.55), 32, 32),
      new THREE.MeshBasicMaterial({ color: p.hex, transparent: true, opacity: isHighlighted ? 0.18 : isDimmed ? 0.02 : 0.08 }),
    );
    group.add(glow);

    // pulsing ring for highlighted/search results
    if (isHighlighted) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(r * 2.2, 0.3, 16, 64),
        new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.45 }),
      );
      ring.rotation.x = Math.PI / 2;
      group.add(ring);

      const ring2 = new THREE.Mesh(
        new THREE.TorusGeometry(r * 2.2, 0.3, 16, 64),
        new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.35 }),
      );
      ring2.rotation.y = Math.PI / 2;
      group.add(ring2);
    }

    // orbital ring for teams
    if (node.type === "team" && !isHighlighted) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(r * 2, 0.25, 16, 64),
        new THREE.MeshBasicMaterial({ color: p.hex, transparent: true, opacity: isDimmed ? 0.05 : 0.25 }),
      );
      ring.rotation.x = Math.PI / 2;
      group.add(ring);
    }

    // label sprite
    if (showLabels && !isDimmed) {
      const canvas = document.createElement("canvas");
      canvas.width = 512; canvas.height = 80;
      const ctx = canvas.getContext("2d")!;
      ctx.clearRect(0, 0, 512, 80);
      const text = node.label.length > 20 ? node.label.slice(0, 19) + "…" : node.label;
      ctx.font = `bold ${isHighlighted ? 32 : 28}px Inter, system-ui, sans-serif`;
      const tw = Math.min(ctx.measureText(text).width + 32, 500);
      const tx = (512 - tw) / 2;
      ctx.fillStyle = isHighlighted ? "rgba(120,80,0,0.9)" : "rgba(8,12,30,0.82)";
      ctx.beginPath(); ctx.roundRect(tx, 10, tw, 56, 14); ctx.fill();
      ctx.strokeStyle = isHighlighted ? "#fbbf2488" : p.main + "55";
      ctx.lineWidth = isHighlighted ? 2.5 : 1.5;
      ctx.beginPath(); ctx.roundRect(tx, 10, tw, 56, 14); ctx.stroke();
      ctx.fillStyle = isHighlighted ? "#fef3c7" : p.glow;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(text, 256, 40);
      const tex = new THREE.CanvasTexture(canvas);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
      sprite.scale.set(r * 6, r * 1, 1);
      sprite.position.set(0, r + 4.5, 0);
      group.add(sprite);
    }

    return group;
  }, [showLabels, highlightedIds]);

  /* ── click → fly camera ── */
  const handleNodeClick = useCallback((node: FGNode) => {
    setSelected(node);
    if (fgRef.current) {
      const d = 130;
      fgRef.current.cameraPosition(
        { x: (node.x ?? 0) + d, y: (node.y ?? 0) + d * 0.35, z: (node.z ?? 0) + d },
        { x: node.x, y: node.y, z: node.z }, 1200,
      );
    }
  }, []);

  /* ── fullscreen ── */
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen(); setIsFullscreen(true);
    } else {
      document.exitFullscreen(); setIsFullscreen(false);
    }
  };

  /* ── initial camera angle for 3D depth ── */
  useEffect(() => {
    if (!isLoading && !error && rawData && fgRef.current) {
      setTimeout(() => {
        fgRef.current?.cameraPosition(
          { x: 250, y: 200, z: 350 },
          { x: 0, y: 0, z: 0 },
          2000,
        );
      }, 500);
    }
  }, [isLoading, error, rawData]);

  /* ── stats ── */
  const stats = useMemo(() => {
    if (!rawData) return { teams: 0, members: 0, projects: 0, edges: 0 };
    return {
      teams: rawData.nodes.filter(n => n.type === "team").length,
      members: rawData.nodes.filter(n => n.type === "member").length,
      projects: rawData.nodes.filter(n => n.type === "project").length,
      edges: rawData.edges.length,
    };
  }, [rawData]);

  /* ── connections for detail panel ── */
  const connections = useMemo(() => {
    if (!selected || !rawData) return [];
    return rawData.edges
      .filter(e => e.source === selected.id || e.target === selected.id)
      .map(e => {
        const otherId = e.source === selected.id ? e.target : e.source;
        return { ...e, node: rawData.nodes.find(n => n.id === otherId) };
      });
  }, [selected, rawData]);

  /* ================================================================ */
  return (
    <div ref={containerRef} className="relative flex flex-col h-[calc(100vh-3.5rem)] bg-[#060a18] overflow-hidden">

      {/* ── HUD top-bar ── */}
      <div className="absolute top-0 inset-x-0 z-30 flex items-center justify-between px-5 py-3 bg-gradient-to-b from-[#080d22ee] via-[#080d22aa] to-transparent pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/25">
            <GitGraph className="h-5 w-5 text-white" />
            <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-400 border-2 border-[#080d22] animate-pulse" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">Neural Knowledge Graph</h1>
            <p className="text-[11px] text-slate-400">
              {stats.teams} teams · {stats.members} members · {stats.projects} projects · {stats.edges} connections
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 pointer-events-auto">
          {/* Search toggle */}
          <button
            onClick={() => { setSearchOpen(v => !v); setTimeout(() => searchInputRef.current?.focus(), 100); }}
            className={`p-2 rounded-lg transition ${searchOpen ? "bg-amber-500/20 text-amber-400" : "text-slate-400 hover:text-white hover:bg-white/5"}`}
            title="Search for skills / people"
          >
            <Search className="h-4 w-4" />
          </button>
          <div className="w-px h-5 bg-slate-700 mx-0.5" />
          {(["all", "team", "member", "project"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${
                filter === f
                  ? "bg-white/10 text-white border-white/20 shadow-sm"
                  : "bg-transparent text-slate-500 border-transparent hover:text-white hover:bg-white/5"
              }`}>{f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1) + "s"}</button>
          ))}
          <div className="w-px h-5 bg-slate-700 mx-1" />
          <button onClick={() => setShowLabels(v => !v)} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition" title="Toggle labels">
            {showLabels ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>
          <button onClick={fetchGraphData} disabled={isLoading} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition disabled:opacity-40">
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <button onClick={toggleFullscreen} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition">
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* ── Search panel ── */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            key="search-panel"
            initial={{ x: -380, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -380, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 250 }}
            className="absolute top-16 left-4 bottom-16 w-[340px] z-30 bg-[#0b1028ee] backdrop-blur-xl border border-white/10 rounded-2xl flex flex-col shadow-2xl overflow-hidden"
          >
            {/* Search header */}
            <div className="px-4 py-3 border-b border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                  <Target className="h-3.5 w-3.5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Find Best Fit</p>
                  <p className="text-[10px] text-slate-400">Search skills, people, or projects</p>
                </div>
                <button onClick={() => { setSearchOpen(false); setSearchQuery(""); setHighlightedIds(new Set()); }}
                  className="ml-auto p-1 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder='e.g. "blockchain", "react", "Aditya"'
                  className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition"
                />
                {searchQuery && (
                  <button onClick={() => { setSearchQuery(""); setHighlightedIds(new Set()); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-white/10 text-slate-500">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
              {/* Quick search tags */}
              <div className="flex flex-wrap gap-1 mt-2">
                {["blockchain", "react", "python", "design", "backend", "devops"].map(tag => (
                  <button
                    key={tag}
                    onClick={() => { setSearchQuery(tag); searchInputRef.current?.focus(); }}
                    className="px-2 py-0.5 rounded-full text-[10px] bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:border-amber-500/30 transition capitalize"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto px-3 py-2">
              {!searchQuery.trim() ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                  <Sparkles className="h-8 w-8 text-slate-600 mb-3" />
                  <p className="text-xs text-slate-400">Type a skill like <span className="text-amber-400">"blockchain"</span> to find the best-fit person, team, or project in your organization.</p>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-center">
                  <p className="text-xs text-slate-500">No matches for "{searchQuery}"</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-500 font-medium px-1 mb-1">
                    {searchResults.length} result{searchResults.length !== 1 && "s"} — sorted by relevance
                  </p>
                  {searchResults.map((result, i) => (
                    <button
                      key={result.nodeId}
                      onClick={() => flyToNode(result.nodeId)}
                      className="w-full flex items-center gap-3 bg-white/[0.03] hover:bg-white/[0.08] rounded-xl px-3 py-2.5 transition text-left group"
                    >
                      <div className="relative">
                        <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: (COLORS[result.type as keyof typeof COLORS]?.main ?? "#64748b") + "20" }}>
                          {result.type === "member" ? <UserCheck className="h-4 w-4" style={{ color: COLORS.member.main }} /> :
                           result.type === "team" ? <Users className="h-4 w-4" style={{ color: COLORS.team.main }} /> :
                           result.type === "project" ? <Briefcase className="h-4 w-4" style={{ color: COLORS.project.main }} /> :
                           <Zap className="h-4 w-4" style={{ color: COLORS.skill.main }} />}
                        </div>
                        {i === 0 && (
                          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-amber-500 flex items-center justify-center">
                            <span className="text-[8px] font-bold text-black">★</span>
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white truncate">{result.label}</p>
                        <p className="text-[10px] text-slate-500 truncate">{result.matchReason}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[9px] font-medium text-amber-400/80">{result.score}%</span>
                        <ChevronRight className="h-3 w-3 text-slate-600 group-hover:text-slate-300 transition" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Legend (bottom-left) ── */}
      <div className="absolute bottom-4 left-4 z-20 flex gap-3 bg-[#0d1229cc] backdrop-blur-md rounded-xl px-4 py-2.5 border border-white/5">
        {Object.entries(COLORS).map(([t, c]) => (
          <div key={t} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.main, boxShadow: `0 0 8px ${c.glow}` }} />
            <span className="text-[11px] text-slate-300 capitalize">{t}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 ml-1">
          <Zap className="h-3 w-3 text-slate-500" />
          <span className="text-[11px] text-slate-400">{graphData.links.length} links</span>
        </div>
      </div>

      {/* ── loading ── */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-40 bg-[#060a18ee]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-14 w-14 text-indigo-400 animate-spin" />
            <p className="text-sm text-slate-300 font-medium">Loading Neural Graph…</p>
          </div>
        </div>
      )}

      {/* ── error ── */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center z-40 bg-[#060a18]">
          <div className="max-w-sm text-center space-y-4 p-8">
            <div className="mx-auto rounded-full bg-red-500/10 p-4 w-fit"><Network className="h-10 w-10 text-red-400" /></div>
            <h3 className="text-lg font-semibold text-white">Connection Failed</h3>
            <p className="text-sm text-slate-400">{error}</p>
            <button onClick={fetchGraphData} className="px-5 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-500 transition">Retry</button>
          </div>
        </div>
      )}

      {/* ── 3-D Force Graph ── */}
      {!isLoading && !error && rawData && (
        <ForceGraph3D
          ref={fgRef}
          width={dimensions.w}
          height={dimensions.h}
          graphData={graphData}
          nodeThreeObject={nodeThreeObject}
          nodeThreeObjectExtend={false}
          onNodeClick={handleNodeClick as any}
          linkColor={(link: any) => link.color ?? EDGE_COLORS.DEFAULT}
          linkWidth={1.4}
          linkOpacity={0.7}
          linkDirectionalParticles={3}
          linkDirectionalParticleWidth={2}
          linkDirectionalParticleSpeed={0.004}
          linkDirectionalParticleColor={(link: any) => {
            const t = (link as FGEdge).type;
            return t === "HAS_PROJECT" ? "#a855f7" : t === "MEMBER_OF" ? "#3b82f6" : "#22c55e";
          }}
          backgroundColor="#060a18"
          showNavInfo={false}
          enableNodeDrag={true}
          d3AlphaDecay={0.012}
          d3VelocityDecay={0.22}
          warmupTicks={120}
          cooldownTicks={350}
          d3Force={(name: string, force: any) => {
            // Stronger charge for more 3D spread
            if (name === "charge" && force) force.strength(-180).distanceMax(500);
            // Spread across Z axis
            if (name === "link" && force) force.distance(80);
          }}
        />
      )}

      {/* ── Detail side-panel ── */}
      <AnimatePresence>
        {selected && (
          <motion.div key="panel"
            initial={{ x: 360, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 360, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 220 }}
            className="absolute top-0 right-0 bottom-0 w-[340px] z-30 bg-[#0b1028ee] backdrop-blur-xl border-l border-white/5 flex flex-col shadow-2xl"
          >
            {/* header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: COLORS[selected.type]?.main ?? "#64748b", boxShadow: `0 0 24px ${COLORS[selected.type]?.glow ?? "#64748b"}50` }}>
                  {selected.type === "team" ? <Users className="h-5 w-5 text-white" /> : selected.type === "project" ? <Briefcase className="h-5 w-5 text-white" /> : <Network className="h-5 w-5 text-white" />}
                </div>
                <div>
                  <p className="font-semibold text-white text-sm">{selected.label}</p>
                  <p className="text-[11px] capitalize text-slate-400">{selected.type}</p>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition"><X className="h-4 w-4" /></button>
            </div>

            {/* body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {/* properties */}
              {selected.properties && Object.keys(selected.properties).length > 0 && (
                <div>
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">Properties</h4>
                  <div className="space-y-1.5">
                    {Object.entries(selected.properties).map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between bg-white/[0.03] rounded-lg px-3 py-2">
                        <span className="text-xs text-slate-400">{k}</span>
                        <span className="text-xs font-medium text-white">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* connections */}
              <div>
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">Connections ({connections.length})</h4>
                {connections.length === 0 ? <p className="text-xs text-slate-500 italic">No connections</p> : (
                  <div className="space-y-1.5">
                    {connections.map((c, i) => (
                      <button key={i} onClick={() => { if (c.node) handleNodeClick(c.node as FGNode); }}
                        className="w-full flex items-center gap-3 bg-white/[0.03] hover:bg-white/[0.07] rounded-lg px-3 py-2.5 transition text-left group">
                        <span className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: (COLORS[c.node?.type ?? "member"]?.main ?? "#64748b") + "25" }}>
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[c.node?.type ?? "member"]?.main ?? "#64748b" }} />
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-white truncate">{c.node?.label ?? "Unknown"}</p>
                          <p className="text-[10px] text-slate-500">{c.type.replace(/_/g, " ")}</p>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 text-slate-600 group-hover:text-slate-300 transition" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GraphVisualization;
