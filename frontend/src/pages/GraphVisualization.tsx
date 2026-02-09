/**
 * GraphVisualization — 3D Neural Knowledge Graph
 *
 * Full-screen force-directed 3D graph of teams ↔ members ↔ projects
 * Light mode, professional solid colors, "Non-AI" aesthetic.
 */
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import ForceGraph3D from "react-force-graph-3d";
import * as THREE from "three";
import {
  GitGraph, RefreshCw, Loader2, Users, Briefcase, Network,
  X, Maximize2, Minimize2, ChevronRight, Eye, EyeOff, Zap,
  Search, Sparkles, Target, UserCheck, Focus, ChevronDown,
} from "lucide-react";

/* ── types ── */
interface RawNode {
  id: string;
  label: string;
  type: "team" | "member" | "project" | "skill" | "ticket";
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

import { GRAPH_COLORS, EDGE_COLORS, NODE_SIZES } from "@/lib/colors";
import { API_BASE_URL } from "@/lib/api_config";

/* ── palette (Light Mode - Solid & Professional) ── */
// Uses constants from @/lib/colors
const COLORS = GRAPH_COLORS;


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

    // Project tech match
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

  // Also find connected members
  const directIds = new Set(results.map(r => r.nodeId));
  for (const edge of data.edges) {
    if (directIds.has(edge.target)) {
      const srcNode = data.nodes.find(n => n.id === edge.source);
      if (srcNode && srcNode.type === "member" && !directIds.has(srcNode.id)) {
        results.push({
          nodeId: srcNode.id, label: srcNode.label, type: "member", score: 40,
          matchReason: `Connected to matching ${edge.type.replace(/_/g, " ").toLowerCase()}`,
        });
        directIds.add(srcNode.id);
      }
    }
    if (directIds.has(edge.source)) {
      const tgtNode = data.nodes.find(n => n.id === edge.target);
      if (tgtNode && tgtNode.type === "member" && !directIds.has(tgtNode.id)) {
        results.push({
          nodeId: tgtNode.id, label: tgtNode.label, type: "member", score: 40,
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
  const navigate = useNavigate();
  const fgRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [rawData, setRawData] = useState<RawGraph | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<FGNode | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const [showSkills, setShowSkills] = useState(true);
  const [showTickets, setShowTickets] = useState(false); // Off by default for cleaner view
  const [filter, setFilter] = useState("all");
  const [dimensions, setDimensions] = useState({ w: 800, h: 600 });

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Project Focus Mode
  const [focusedProjectId, setFocusedProjectId] = useState<string | null>(null);
  const [projectListOpen, setProjectListOpen] = useState(false);

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
      const res = await fetch(`${API_BASE_URL}/api/graph`);
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

    // Filter out hidden node types
    if (!showSkills) nodes = nodes.filter(n => n.type !== "skill");
    if (!showTickets) nodes = nodes.filter(n => n.type !== "ticket");

    // Project Focus Mode: Show only focused project and its connections
    if (focusedProjectId) {
      const connected = new Set<string>([focusedProjectId]);
      rawData.edges.forEach(e => {
        if (e.source === focusedProjectId) connected.add(e.target);
        if (e.target === focusedProjectId) connected.add(e.source);
      });
      // Also get teams connected to those members
      rawData.edges.forEach(e => {
        if (connected.has(e.source) || connected.has(e.target)) {
          connected.add(e.source);
          connected.add(e.target);
        }
      });
      nodes = nodes.filter(n => connected.has(n.id));
    } else if (filter !== "all") {
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
  }, [rawData, filter, focusedProjectId, showSkills, showTickets]);

  /* ── Get all projects for quick focus ── */
  const allProjects = useMemo(() => {
    if (!rawData) return [];
    return rawData.nodes.filter(n => n.type === "project").sort((a, b) => a.label.localeCompare(b.label));
  }, [rawData]);

  /* ── Focus on a project ── */
  const focusOnProject = useCallback((projectId: string | null) => {
    setFocusedProjectId(projectId);
    setProjectListOpen(false);
    if (projectId && fgRef.current) {
      const gd = fgRef.current.graphData();
      setTimeout(() => {
        const node = gd.nodes.find((n: FGNode) => n.id === projectId);
        if (node && fgRef.current) {
          fgRef.current.cameraPosition(
            { x: (node.x ?? 0) + 150, y: (node.y ?? 0) + 100, z: (node.z ?? 0) + 150 },
            { x: node.x, y: node.y, z: node.z }, 1000,
          );
        }
      }, 300);
    }
  }, []);

  /* ── custom 3-D node objects (Light Mode) ── */
  const nodeThreeObject = useCallback((node: FGNode) => {
    const p = COLORS[node.type] ?? COLORS.member;
    const isHighlighted = highlightedIds.size > 0 && highlightedIds.has(node.id);
    const isDimmed = highlightedIds.size > 0 && !highlightedIds.has(node.id);
    const r = (NODE_SIZES[node.type] ?? 8) * (isHighlighted ? 0.52 : 0.38);
    const group = new THREE.Group();

    // core sphere - polished matte
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(r, 32, 32),
      new THREE.MeshStandardMaterial({
        color: p.hex,
        roughness: 0.5,
        metalness: 0.1,
        transparent: true,
        opacity: isDimmed ? 0.2 : 1.0,
      }),
    );
    group.add(sphere);

    // pulsing ring for highlighted
    if (isHighlighted) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(r * 2.2, 0.3, 32, 64),
        new THREE.MeshBasicMaterial({ color: 0xea580c, side: THREE.DoubleSide }), // Orange
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
      ctx.font = `bold ${isHighlighted ? 32 : 28}px Inter, sans-serif`;
      const tw = Math.min(ctx.measureText(text).width + 32, 500);
      const tx = (512 - tw) / 2;

      // Light background, dark text
      ctx.fillStyle = isHighlighted ? "rgba(255, 237, 213, 0.9)" : "rgba(255, 255, 255, 0.85)";
      ctx.beginPath(); ctx.roundRect(tx, 10, tw, 56, 8); ctx.fill();

      ctx.strokeStyle = isHighlighted ? "#f97316" : "#cbd5e1";
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(tx, 10, tw, 56, 8); ctx.stroke();

      ctx.fillStyle = "#1e293b"; // Slate-800
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

  /* ── initial camera angle & d3Force limits ── */
  useEffect(() => {
    if (!isLoading && !error && rawData && fgRef.current) {
      // Configuration moved here to avoid prop type errors
      fgRef.current.d3Force('charge').strength(-120);
      fgRef.current.d3Force('link').distance(70);

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
    if (!rawData) return { teams: 0, members: 0, projects: 0, skills: 0, tickets: 0, edges: 0 };
    return {
      teams: rawData.nodes.filter(n => n.type === "team").length,
      members: rawData.nodes.filter(n => n.type === "member").length,
      projects: rawData.nodes.filter(n => n.type === "project").length,
      skills: rawData.nodes.filter(n => n.type === "skill").length,
      tickets: rawData.nodes.filter(n => n.type === "ticket").length,
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
    <div ref={containerRef} className="relative flex flex-col h-[calc(100vh-3.5rem)] bg-slate-50 overflow-hidden text-slate-900">

      {/* ── HUD top-bar ── */}
      <div className="absolute top-0 inset-x-0 z-30 flex items-center justify-between px-5 py-3 bg-white/80 backdrop-blur-md border-b border-slate-200 pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 shadow-md shadow-indigo-200">
            <GitGraph className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800 tracking-tight">Knowledge Graph</h1>
            <p className="text-[11px] text-slate-500 font-medium">
              {stats.teams} teams · {stats.members} members · {stats.projects} projects · {stats.skills} skills · {stats.tickets} tickets
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 pointer-events-auto">
          {/* Search toggle */}
          <button
            onClick={() => { setSearchOpen(v => !v); setTimeout(() => searchInputRef.current?.focus(), 100); }}
            className={`p-2 rounded-lg transition ${searchOpen ? "bg-amber-100 text-amber-700" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"}`}
            title="Search"
          >
            <Search className="h-4 w-4" />
          </button>

          {/* Project Focus Dropdown */}
          <div className="relative">
            <button
              onClick={() => setProjectListOpen(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${focusedProjectId
                ? "bg-purple-100 text-purple-700 border-purple-300"
                : "bg-white text-slate-500 border-slate-200 hover:text-slate-900 hover:bg-slate-50"
                }`}
              title="Focus on Project"
            >
              <Focus className="h-3.5 w-3.5" />
              {focusedProjectId
                ? allProjects.find(p => p.id === focusedProjectId)?.label.slice(0, 12) || "Project"
                : "Focus"}
              <ChevronDown className="h-3 w-3" />
            </button>

            {/* Dropdown */}
            <AnimatePresence>
              {projectListOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="absolute top-full mt-1 right-0 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden"
                >
                  <div className="p-2 border-b border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">Project Focus Mode</p>
                  </div>
                  <div className="max-h-64 overflow-y-auto py-1">
                    <button
                      onClick={() => focusOnProject(null)}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-slate-50 transition text-left ${!focusedProjectId ? "bg-slate-100 font-bold" : "text-slate-600"
                        }`}
                    >
                      <Network className="h-3.5 w-3.5 text-slate-400" />
                      Show All (No Focus)
                    </button>
                    {allProjects.map(project => (
                      <button
                        key={project.id}
                        onClick={() => focusOnProject(project.id)}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-purple-50 transition text-left ${focusedProjectId === project.id ? "bg-purple-100 text-purple-700 font-bold" : "text-slate-700"
                          }`}
                      >
                        <Briefcase className="h-3.5 w-3.5" style={{ color: COLORS.project.main }} />
                        <span className="truncate">{project.label}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="w-px h-5 bg-slate-300 mx-1" />
          {(["all", "team", "member", "project"] as const).map(f => (
            <button key={f} onClick={() => { setFilter(f); setFocusedProjectId(null); }}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all border ${filter === f && !focusedProjectId
                ? "bg-slate-800 text-white border-slate-800 shadow-sm"
                : "bg-white text-slate-500 border-slate-200 hover:text-slate-900 hover:bg-slate-50"
                }`}>{f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1) + "s"}</button>
          ))}
          <div className="w-px h-5 bg-slate-300 mx-1" />

          {/* Skills toggle */}
          <button
            onClick={() => setShowSkills(v => !v)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all border ${showSkills
              ? "bg-orange-100 text-orange-700 border-orange-300"
              : "bg-white text-slate-400 border-slate-200 hover:bg-slate-50"
              }`}
            title="Toggle Skills"
          >
            <span className="w-2 h-2 rounded-full" style={{ background: showSkills ? COLORS.skill.main : "#cbd5e1" }} />
            Skills
          </button>

          {/* Tickets toggle */}
          <button
            onClick={() => setShowTickets(v => !v)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all border ${showTickets
              ? "bg-yellow-100 text-yellow-700 border-yellow-300"
              : "bg-white text-slate-400 border-slate-200 hover:bg-slate-50"
              }`}
            title="Toggle Tickets"
          >
            <span className="w-2 h-2 rounded-full" style={{ background: showTickets ? COLORS.ticket.main : "#cbd5e1" }} />
            Tickets
          </button>

          <div className="w-px h-5 bg-slate-300 mx-1" />
          <button onClick={() => setShowLabels(v => !v)} className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition" title="Toggle labels">
            {showLabels ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>
          <button onClick={fetchGraphData} disabled={isLoading} className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition disabled:opacity-40">
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <button onClick={toggleFullscreen} className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition">
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
            className="absolute top-16 left-4 bottom-16 w-[340px] z-30 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-2xl flex flex-col shadow-xl overflow-hidden"
          >
            {/* Search header */}
            <div className="px-4 py-3 border-b border-slate-100">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-7 w-7 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Target className="h-3.5 w-3.5 text-amber-700" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">Find Best Fit</p>
                  <p className="text-[10px] text-slate-500">Search skills, people, or projects</p>
                </div>
                <button onClick={() => { setSearchOpen(false); setSearchQuery(""); setHighlightedIds(new Set()); }}
                  className="ml-auto p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-800 transition">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder='e.g. "react", "blockchain"'
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition"
                />
                {searchQuery && (
                  <button onClick={() => { setSearchQuery(""); setHighlightedIds(new Set()); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-slate-200 text-slate-400">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto px-3 py-2">
              {!searchQuery.trim() ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                  <Sparkles className="h-8 w-8 text-slate-300 mb-3" />
                  <p className="text-xs text-slate-500">Type a skill to find matching nodes.</p>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-center">
                  <p className="text-xs text-slate-500">No matches found.</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-500 font-bold px-1 mb-1 uppercase tracking-wider">
                    {searchResults.length} results
                  </p>
                  {searchResults.map((result, i) => (
                    <button
                      key={result.nodeId}
                      onClick={() => flyToNode(result.nodeId)}
                      className="w-full flex items-center gap-3 bg-white hover:bg-slate-50 border border-transparent hover:border-slate-200 rounded-xl px-3 py-2.5 transition text-left group shadow-sm hover:shadow-md"
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
                          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-amber-500 flex items-center justify-center shadow-sm">
                            <span className="text-[8px] font-bold text-white">★</span>
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{result.label}</p>
                        <p className="text-[10px] text-slate-500 truncate">{result.matchReason}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[9px] font-medium text-amber-600">{result.score}%</span>
                        <ChevronRight className="h-3 w-3 text-slate-300 group-hover:text-slate-600 transition" />
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
      <div className="absolute bottom-4 left-4 z-20 flex gap-3 bg-white/90 backdrop-blur-md rounded-xl px-4 py-2.5 border border-slate-200 shadow-sm">
        {Object.entries(COLORS).map(([t, c]) => (
          <div key={t} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.main }} />
            <span className="text-[11px] font-bold text-slate-600 capitalize">{t}</span>
          </div>
        ))}
      </div>

      {/* ── loading ── */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-40 bg-slate-50/90 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 text-indigo-600 animate-spin" />
            <p className="text-sm text-slate-600 font-medium">Loading Graph...</p>
          </div>
        </div>
      )}

      {/* ── error ── */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center z-40 bg-slate-50">
          <div className="max-w-sm text-center space-y-4 p-8">
            <div className="mx-auto rounded-full bg-red-100 p-4 w-fit"><Network className="h-10 w-10 text-red-600" /></div>
            <h3 className="text-lg font-bold text-slate-900">Connection Failed</h3>
            <p className="text-sm text-slate-600">{error}</p>
            <button onClick={fetchGraphData} className="px-5 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-sm">Retry</button>
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
          linkWidth={1.5}
          linkOpacity={0.6}
          backgroundColor="#f8fafc" // Slate-50
          showNavInfo={false}
          enableNodeDrag={true}
          d3AlphaDecay={0.012}
          d3VelocityDecay={0.22}
          warmupTicks={120}
          cooldownTicks={350}
        />
      )}

      {/* ── Detail side-panel ── */}
      <AnimatePresence>
        {selected && (
          <motion.div key="panel"
            initial={{ x: 360, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 360, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 220 }}
            className="absolute top-0 right-0 bottom-0 w-[340px] z-30 bg-white border-l border-slate-200 flex flex-col shadow-xl"
          >
            {/* header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center shadow-sm"
                  style={{ backgroundColor: (COLORS[selected.type]?.main ?? "#64748b") + "20" }}>
                  {selected.type === "team" ? <Users className="h-5 w-5" style={{ color: COLORS.team.main }} /> :
                    selected.type === "project" ? <Briefcase className="h-5 w-5" style={{ color: COLORS.project.main }} /> :
                      <Network className="h-5 w-5" style={{ color: COLORS.member.main }} />}
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-sm">{selected.label}</p>
                  <p className="text-[11px] capitalize text-slate-500 font-medium">{selected.type}</p>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition"><X className="h-4 w-4" /></button>
            </div>

            {/* body */}
            <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6">

              {/* Actions */}
              {(selected.type === 'project' || selected.type === 'team') && (
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      if (selected.type === 'project') {
                        const edge = rawData?.edges.find(e => e.target === selected.id && e.type === 'HAS_PROJECT');
                        const teamId = edge ? edge.source : 't1';
                        navigate(`/project/${teamId}/${selected.id}`);
                      } else if (selected.type === 'team') {
                        navigate('/teams');
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl font-bold transition-all shadow-md shadow-indigo-600/20 active:scale-95"
                  >
                    {selected.type === 'project' ? <Briefcase className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                    Open {selected.type === 'project' ? 'Project Board' : 'Team Overview'}
                  </button>

                  {/* Focus Mode Button for Projects */}
                  {selected.type === 'project' && (
                    <button
                      onClick={() => {
                        focusOnProject(focusedProjectId === selected.id ? null : selected.id);
                      }}
                      className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold transition-all active:scale-95 ${focusedProjectId === selected.id
                        ? "bg-purple-100 text-purple-700 border-2 border-purple-300"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
                        }`}
                    >
                      <Focus className="h-4 w-4" />
                      {focusedProjectId === selected.id ? "Exit Focus Mode" : "Focus on this Project"}
                    </button>
                  )}
                </div>
              )}

              {/* properties */}
              {selected.properties && Object.keys(selected.properties).length > 0 && (
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">Properties</h4>
                  <div className="space-y-2">
                    {Object.entries(selected.properties).map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-lg px-3 py-2.5 transition hover:border-slate-300">
                        <span className="text-xs font-semibold text-slate-500 capitalize">{k.replace('_', ' ')}</span>
                        <span className="text-xs font-bold text-slate-800 text-right">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* connections */}
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">Connections ({connections.length})</h4>
                {connections.length === 0 ? <p className="text-xs text-slate-400 italic">No connections</p> : (
                  <div className="space-y-2">
                    {connections.map((c, i) => (
                      <button key={i} onClick={() => { if (c.node) handleNodeClick(c.node as FGNode); }}
                        className="w-full flex items-center gap-3 bg-white hover:bg-slate-50 border border-slate-100 hover:border-slate-300 rounded-lg px-3 py-2.5 transition text-left group shadow-sm">
                        <span className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: (COLORS[c.node?.type ?? "member"]?.main ?? "#64748b") + "20" }}>
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[c.node?.type ?? "member"]?.main ?? "#64748b" }} />
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-700 truncate">{c.node?.label ?? "Unknown"}</p>
                          <p className="text-[10px] text-slate-500 font-medium">{c.type.replace(/_/g, " ")}</p>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-600 transition" />
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
