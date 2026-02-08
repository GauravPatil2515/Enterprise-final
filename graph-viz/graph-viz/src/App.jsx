import React, { useState, useEffect, useRef } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import ForceGraph2D from 'react-force-graph-2d';
import { fetchGraphData, fetchProjectFit, fetchCommGap, fetchSkills, fetchProjects } from './api';
import { Activity, Users, Search, AlertTriangle, Zap, Layers, ChevronDown, CheckSquare, Square, Filter, Sliders, Briefcase } from 'lucide-react';
import * as THREE from 'three';
import SpriteText from 'three-spritetext';
import './index.css';

const DEPARTMENTS = ["Engineering", "Marketing", "Sales", "HR", "Finance", "Product", "Design"];

function App() {
  const [data, setData] = useState({ nodes: [], links: [] });
  const [mode, setMode] = useState('3d');
  const [activeTab, setActiveTab] = useState('overview');
  
  // Filter States
  const [selectedDepartments, setSelectedDepartments] = useState([]); 
  const [minPerformance, setMinPerformance] = useState(0);
  const [showSkills, setShowSkills] = useState(false);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(""); // "" = All
  
  // Insight States
  const [projectFit, setProjectFit] = useState(null);
  const [commGap, setCommGap] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Skills State
  const [skillsByCategory, setSkillsByCategory] = useState({});
  const [selectedSkills, setSelectedSkills] = useState(new Set());
  const [expandedCategory, setExpandedCategory] = useState(null);

  const fgRef = useRef();

  // Initial Load
  useEffect(() => {
    async function init() {
      // Fetch concurrent data
      const [skillsData, projectsData] = await Promise.all([
          fetchSkills(),
          fetchProjects()
      ]);

      if (skillsData) setSkillsByCategory(skillsData);
      if (projectsData) setProjects(projectsData);
      
      // Fetch Graph Data with default filters
      await updateGraph();
    }
    init();
  }, []);

  // Update Graph when filters change
  const updateGraph = async () => {
    setLoading(true);
    const graphData = await fetchGraphData({
      departments: selectedDepartments,
      minPerf: minPerformance,
      showSkills: showSkills,
      projectId: selectedProject
    });
    
    if (graphData.nodes && graphData.links) {
      // Add visual properties
      graphData.nodes.forEach(node => {
        const label = node.label;
        if (label === 'Department') {
          node.group = 'Department';
          node.color = '#ff6b6b'; 
          node.val = 30;
        } else if (label === 'Employee') {
          node.group = 'Employee';
          node.color = '#4ecdc4'; 
          node.val = 15;
        } else if (label === 'Skill') {
          node.group = 'Skill';
          node.color = '#ffe66d'; 
          node.val = 8;
        } else if (label === 'Project') {
          node.group = 'Project';
          node.color = '#a78bfa'; // Soft Violet
          node.val = 40;
        } else {
          node.color = '#ffffff';
          node.val = 5;
        }
      });
      setData(graphData);
    }
    setLoading(false);
  };

  useEffect(() => {
    updateGraph();
  }, [selectedDepartments, minPerformance, showSkills, selectedProject]);


  const toggleDepartment = (dept) => {
    if (selectedDepartments.includes(dept)) {
      setSelectedDepartments(selectedDepartments.filter(d => d !== dept));
    } else {
      setSelectedDepartments([...selectedDepartments, dept]);
    }
  };
  
  const toggleSkill = (skill) => {
    const newSelected = new Set(selectedSkills);
    if (newSelected.has(skill)) {
      newSelected.delete(skill);
    } else {
      newSelected.add(skill);
    }
    setSelectedSkills(newSelected);
  };

  const toggleCategory = (category) => {
    setExpandedCategory(expandedCategory === category ? null : category);
  };

  const handleProjectFit = async () => {
    setLoading(true);
    const skillsArray = Array.from(selectedSkills);
    if (skillsArray.length === 0) {
      alert("Please select at least one skill.");
      setLoading(false);
      return;
    }
    const result = await fetchProjectFit(skillsArray);
    setProjectFit(result);
    setLoading(false);
  };

  const handleCommGap = async () => {
    setLoading(true);
    const result = await fetchCommGap('Tech', 'Marketing');
    setCommGap(result);
    setLoading(false);
  };

  const getNodeTooltip = (node) => {
     if (!node.properties) return node.id;

    if (node.label === 'Employee') {
        return `
          <div style="background: rgba(10, 15, 30, 0.95); padding: 12px; border-radius: 8px; border: 1px solid #4ecdc4; box-shadow: 0 4px 12px rgba(0,0,0,0.5); font-family: sans-serif; min-width: 150px;">
            <strong style="color: #fff; font-size: 16px; display: block; margin-bottom: 4px;">${node.properties.name || 'Unknown'}</strong>
            <span style="color: #4ecdc4; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">${node.properties.role || 'Role N/A'}</span>
            <div style="margin-top: 8px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 6px; font-size: 12px; color: #cbd5e1;">
              Performance: <span style="color: #fbbf24; font-weight: bold;">${node.properties.performance || 'N/A'}</span>
            </div>
          </div>
        `;
      }
      if (node.label === 'Department') {
        return `
          <div style="background: rgba(10, 15, 30, 0.95); padding: 10px; border-radius: 8px; border: 1px solid #ff6b6b; box-shadow: 0 4px 12px rgba(0,0,0,0.5); font-family: sans-serif;">
            <strong style="color: #ff6b6b; font-size: 15px;">${node.properties.name} Department</strong>
          </div>
        `;
      }
      if (node.label === 'Project') {
        return `
          <div style="background: rgba(10, 15, 30, 0.95); padding: 10px; border-radius: 8px; border: 1px solid #8b5cf6; box-shadow: 0 4px 12px rgba(0,0,0,0.5); font-family: sans-serif;">
            <strong style="color: #8b5cf6; font-size: 15px;">${node.properties.name}</strong>
             <div style="margin-top: 4px; font-size: 12px; color: #a78bfa;">Status: ${node.properties.status}</div>
             <div style="font-size: 12px; color: #a78bfa;">Type: ${node.properties.type}</div>
          </div>
        `;
      }
      if (node.label === 'Skill') {
        return `
          <div style="background: rgba(10, 15, 30, 0.95); padding: 6px 12px; border-radius: 20px; border: 1px solid #ffe66d; text-align: center; font-family: sans-serif;">
            <span style="color: #ffe66d; font-weight: bold;">${node.properties.name}</span>
          </div>
        `;
      }
      return node.id;
  };

  // Custom Node Styling (Using Three.js for 3D)
  const nodeThreeObject = (node) => {
    const group = new THREE.Group();
    
    // 1. Core Sphere (The main node)
    let color = node.color;
    let size = node.val * 0.5;
    
    // Enhance Employee Nodes with Performance Glow
    if (node.label === 'Employee' && node.properties.performance) {
       const perf = parseFloat(node.properties.performance);
       if (perf >= 4.5) {
           color = '#fbbf24'; // Gold for Top Performers
       }
    }

    const geometry = new THREE.SphereGeometry(size, 32, 32);
    const material = new THREE.MeshPhysicalMaterial({
        color: color,
        transparent: true,
        opacity: 0.9,
        metalness: 0.1,
        roughness: 0.3,
        clearcoat: 1.0,
        emissive: color,
        emissiveIntensity: 0.4
    });
    const sphere = new THREE.Mesh(geometry, material);
    group.add(sphere);

    // 2. Outer Glow (Halo) for Departments and Projects
    if (node.label === 'Department' || node.label === 'Project') {
        const glowGeo = new THREE.SphereGeometry(size * 1.4, 32, 32);
        const glowMat = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.15,
            side: THREE.BackSide
        });
        const glowMesh = new THREE.Mesh(glowGeo, glowMat);
        group.add(glowMesh);
    }
    
    // 3. Text Label (Sprite) - Always facing camera
    // Only show text for key nodes to avoid clutter, or on hover
    let showText = true;
    if (node.label === 'Skill' && !showSkills) showText = false;
    // Always show text for Departments/Projects. Employees only if zoomed? 
    // For now, show names for Depts/Projects clearly.
    
    if (node.label === 'Department' || node.label === 'Project') {
        const sprite = new SpriteText(node.properties.name);
        sprite.color = 'white';
        sprite.textHeight = 4; // Text size
        sprite.position.y = size + 4; // Offset above node
        sprite.fontFace = "Arial";
        sprite.fontWeight = "bold";
        sprite.backgroundColor = "rgba(0,0,0,0.5)"; // readable bg
        sprite.padding = 2;
        group.add(sprite);
    }

    return group;
  };


  return (
    <div className="relative w-screen h-screen bg-gray-900 overflow-hidden text-white flex" style={{ minHeight: '100vh', width: '100vw', backgroundColor: '#050510', color: 'white' }}>
      
      {/* Loading Overlay */}
      {loading && (
        <div className="absolute top-4 right-4 z-50 bg-blue-600 px-4 py-2 rounded-lg shadow-lg animate-pulse flex items-center gap-2">
           <Activity className="w-4 h-4 animate-spin" />
           <span className="text-xs font-bold">Updating Graph...</span>
        </div>
      )}

      {/* Sidebar Overlay */}
      <div className="absolute top-4 left-4 z-10 w-96 bg-gray-800/90 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-700 p-6 flex flex-col gap-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
        
        <header className="flex items-center gap-3 border-b border-gray-700 pb-4">
          <div className="p-2 bg-blue-600 rounded-lg">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-teal-400 bg-clip-text text-transparent">
              Enterprise Intel
            </h1>
            <p className="text-xs text-gray-400">AI-Driven Workforce Graph</p>
          </div>
        </header>

        {/* Navigation Tabs */}
        <div className="flex gap-2 bg-gray-700/50 p-1 rounded-xl">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'overview' ? 'bg-blue-600 shadow-lg' : 'hover:bg-gray-700 text-gray-400'}`}
          >
            Filters
          </button>
           <button 
            onClick={() => setActiveTab('insights')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'insights' ? 'bg-blue-600 shadow-lg' : 'hover:bg-gray-700 text-gray-400'}`}
          >
            Analysis
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-h-0">
          
          {/* TAB: FILTERS */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-500">
              
              {/* Project Filter */}
              <div className="space-y-2">
                 <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-violet-400" /> Active Projects
                 </h3>
                 <p className="text-xs text-gray-400">Focus graph on a specific project team.</p>
                 <select 
                    value={selectedProject}
                    onChange={(e) => setSelectedProject(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 text-gray-300 text-xs rounded-lg p-2 focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
                 >
                    <option value="">Show All / No Specific Project</option>
                    {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                 </select>
              </div>

              <div className="h-px bg-gray-700 w-full" />

              {/* Department Filter */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
                   <Filter className="w-4 h-4 text-teal-400" /> Departments
                </h3>
                <div className="grid grid-cols-2 gap-2 mt-2">
                   {DEPARTMENTS.map(dept => (
                      <button 
                        key={dept}
                        onClick={() => toggleDepartment(dept)}
                        className={`text-xs px-3 py-2 rounded-lg border transition-all text-left flex items-center justify-between ${
                            selectedDepartments.includes(dept) 
                            ? 'bg-teal-500/20 border-teal-500 text-teal-300' 
                            : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'
                        }`}
                      >
                         {dept}
                         {selectedDepartments.includes(dept) && <CheckSquare className="w-3 h-3" />}
                      </button>
                   ))}
                </div>
              </div>

               <div className="h-px bg-gray-700 w-full" />

               {/* View Settings */}
               <div className="space-y-3">
                 <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-purple-400" /> View Settings
                 </h3>
                 
                 {/* Performance Filter */}
                 <div className="bg-gray-800 p-3 rounded-lg border border-gray-700 space-y-2">
                    <div className="flex justify-between text-sm">
                       <span className="text-gray-300">Min. Performance</span>
                       <span className="text-purple-400 font-bold">{minPerformance}+</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="5" 
                      step="0.5"
                      value={minPerformance}
                      onChange={(e) => setMinPerformance(parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                 </div>
                 
                  {/* Show Skills Toggle */}
                 <div className="flex items-center justify-between bg-gray-800 p-3 rounded-lg border border-gray-700">
                    <span className="text-sm text-gray-300">Show Skills Categories</span>
                    <button 
                       onClick={() => setShowSkills(!showSkills)}
                       className={`w-10 h-5 rounded-full relative transition-colors ${showSkills ? 'bg-purple-500' : 'bg-gray-600'}`}
                    >
                       <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${showSkills ? 'left-6' : 'left-1'}`} />
                    </button>
                 </div>

               </div>

              <div className="flex gap-2 mt-4 pt-4 border-t border-gray-700">
                 <button 
                  onClick={() => setMode(mode === '3d' ? '2d' : '3d')}
                  className="w-full py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors border border-gray-600"
                >
                  Switch to {mode === '3d' ? '2D' : '3D'} View
                </button>
              </div>

               {/* Stats */}
               <div className="p-3 bg-gray-900/50 rounded-lg border border-gray-800 mt-2">
                 <div className="flex justify-between text-xs text-gray-400">
                   <span>Nodes: <strong className="text-white">{data.nodes.length}</strong></span>
                   <span>Links: <strong className="text-white">{data.links.length}</strong></span>
                 </div>
               </div>

            </div>
          )}

          {/* TAB: INSIGHTS */}
          {activeTab === 'insights' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              
              {/* Project Fit Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
                    <Search className="w-4 h-4 text-teal-400" /> Project Allocation
                  </h3>
                   <span className="text-xs text-gray-500">{selectedSkills.size} skills selected</span>
                </div>
                
                <p className="text-xs text-gray-400 mb-2">
                  Select required skills to match best-fit employees:
                </p>

                {/* Skill Selection UI */}
                <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-2 mb-4 bg-black/20 p-2 rounded-lg">
                    {Object.entries(skillsByCategory).map(([category, skills]) => (
                        <div key={category} className="border border-gray-700 rounded-lg overflow-hidden">
                             <button 
                                onClick={() => toggleCategory(category)}
                                className="w-full flex items-center justify-between p-2 text-xs font-semibold bg-gray-800 hover:bg-gray-700 transition-colors"
                             >
                                <span>{category}</span>
                                <ChevronDown className={`w-3 h-3 transition-transform ${expandedCategory === category ? 'rotate-180' : ''}`} />
                             </button>
                             
                             {expandedCategory === category && (
                                 <div className="p-2 space-y-1 bg-gray-900/50">
                                     {skills.map(skill => (
                                         <button 
                                            key={skill}
                                            onClick={() => toggleSkill(skill)}
                                            className="flex items-center gap-2 w-full text-left p-1 rounded hover:bg-white/5 group"
                                         >
                                             {selectedSkills.has(skill) ? (
                                                 <CheckSquare className="w-3 h-3 text-teal-400" />
                                             ) : (
                                                 <Square className="w-3 h-3 text-gray-600 group-hover:text-gray-400" />
                                             )}
                                             <span className={`text-xs ${selectedSkills.has(skill) ? 'text-teal-200' : 'text-gray-400'}`}>{skill}</span>
                                         </button>
                                     ))}
                                 </div>
                             )}
                        </div>
                    ))}
                </div>

                <button 
                  onClick={handleProjectFit}
                  disabled={loading}
                  className="w-full py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:opacity-90 rounded-lg text-sm font-medium shadow-lg shadow-teal-900/50 transition-all active:scale-95 disabled:opacity-50"
                >
                  {loading ? 'Analyzing...' : 'Run Allocation Analysis'}
                </button>

                {projectFit && (
                  <div className="mt-3 space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                    {projectFit.map((emp, idx) => (
                      <div key={idx} className="p-3 bg-gray-800/80 rounded-lg border-l-4 border-teal-500 text-sm">
                        <div className="flex justify-between items-start">
                          <span className="font-bold text-white">{emp.Name}</span>
                          <span className="text-xs bg-gray-700 px-2 py-0.5 rounded text-gray-300">{emp.matching_skills} Matches</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{emp.Role}</p>
                        <div className="flex justify-between items-center mt-2">
                             <span className="text-xs text-amber-400">Perf: {emp.Performance}</span>
                             <span className="text-[10px] text-gray-500">Skills: {emp.skills_found.slice(0,3).join(', ')}{emp.skills_found.length > 3 ? '...' : ''}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="h-px bg-gray-700 w-full" />

              {/* Comm Gaps Section */}
               <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400" /> Silo Detection
                  </h3>
                  {commGap && <span className="text-xs text-red-400">Issues Found</span>}
                </div>
                
                <p className="text-xs text-gray-400">
                  Analyze communication between <span className="text-gray-200">Tech</span> and <span className="text-gray-200">Marketing</span>
                </p>

                <button 
                  onClick={handleCommGap}
                  disabled={loading}
                  className="w-full py-2 bg-gradient-to-r from-red-600 to-orange-600 hover:opacity-90 rounded-lg text-sm font-medium shadow-lg shadow-red-900/50 transition-all active:scale-95 disabled:opacity-50"
                >
                  {loading ? 'Scanning...' : 'Detect Communication Silos'}
                </button>

                 {commGap && (
                  <div className="mt-3 p-3 bg-red-900/20 border border-red-500/30 rounded-lg text-sm">
                    <div className="flex items-center gap-2 mb-2">
                       <Zap className="w-4 h-4 text-yellow-400" />
                       <span className="font-bold text-red-200">Critical Insight</span>
                    </div>
                    {commGap.some(c => c.PathLength === "No Path") && (
                       <p className="text-xs text-gray-300 mb-2">
                         <span className="font-bold text-red-400">Silo Alert:</span> No direct communication paths found between selected departments.
                       </p>
                    )}
                     <div className="max-h-32 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                      {commGap.filter(c => c.PathLength !== "1").slice(0, 3).map((c, i) => (
                        <div key={i} className="text-xs flex justify-between bg-black/20 p-1.5 rounded">
                          <span>{c.Emp1} ↔ {c.Emp2}</span>
                          <span className="text-gray-400">{c.PathLength === "No Path" ? "Disconnected" : `${c.PathLength} hops`}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      </div>

      {/* Main Graph Visualization */}
      <div className="flex-1 h-full bg-black relative" style={{ flexGrow: 1, height: '100%', minHeight: '100vh' }}>
        {data.nodes.length > 0 ? (
          mode === '3d' ? (
             <ForceGraph3D
              ref={fgRef}
              graphData={data}
              nodeLabel={getNodeTooltip}
              // nodeAutoColorBy="label" // Handled by nodeThreeObject now
              
              // New Visual Settings
              nodeThreeObject={nodeThreeObject}
              nodeThreeObjectExtend={false} // Use ONLY our object
              
              // Links
              linkColor={() => '#ffffff'}
              linkWidth={0.5}
              linkOpacity={0.2}
              
              backgroundColor="#050510" // Deep space blue-black
              width={window.innerWidth} 
              height={window.innerHeight}
              
              onNodeClick={node => {
                 // Focus camera on node
                 const distance = 40;
                 const distRatio = 1 + distance/Math.hypot(node.x, node.y, node.z);
  
                 fgRef.current.cameraPosition(
                   { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio }, // new position
                   node, // lookAt ({ x, y, z })
                   3000  // ms transition duration
                 );
              }}
            />
          ) : (
             <ForceGraph2D
              graphData={data}
              nodeLabel={getNodeTooltip}
              nodeAutoColorBy="label"
              backgroundColor="#050510"
              width={window.innerWidth}
              height={window.innerHeight}
             /> 
          )
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-500">
             <div className="text-center">
                 <p>Loading Graph Data...</p>
                 <p className="text-xs text-gray-600 mt-2">Fetching nodes from Neo4j</p>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
