export const GRAPH_COLORS = {
    team: { main: "#2563eb", hex: 0x2563eb }, // Blue-600
    member: { main: "#16a34a", hex: 0x16a34a }, // Green-600
    project: { main: "#9333ea", hex: 0x9333ea }, // Purple-600
    skill: { main: "#ea580c", hex: 0xea580c }, // Orange-600
    ticket: { main: "#eab308", hex: 0xeab308 }, // Yellow-500
};

export const EDGE_COLORS = {
    MEMBER_OF: "rgba(37,99,235,0.3)",
    HAS_PROJECT: "rgba(147,51,234,0.3)",
    WORKS_ON: "rgba(22,163,74,0.3)",
    HAS_SKILL: "rgba(234,88,12,0.25)",
    HAS_TICKET: "rgba(234,179,8,0.3)",
    ASSIGNED_TO: "rgba(22,163,74,0.2)",
    DEPENDS_ON: "rgba(239,68,68,0.4)",
    COMMUNICATES_WITH: "rgba(99,102,241,0.2)",
    DEFAULT: "rgba(148,163,184,0.3)",
};

export const NODE_SIZES = {
    team: 20,
    project: 15,
    member: 9,
    skill: 6,
    ticket: 5
};
