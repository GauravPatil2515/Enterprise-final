export const fetchGraphData = async (options = {}) => {
    try {
        const { departments = [], minPerf = 0, showSkills = false, projectId = '' } = options;
        const queryParams = new URLSearchParams();
        if (departments.length > 0) queryParams.append('departments', departments.join(','));
        queryParams.append('min_perf', minPerf);
        queryParams.append('show_skills', showSkills);
        if (projectId) queryParams.append('project_id', projectId);

        const response = await fetch(`http://localhost:5000/api/graph?${queryParams.toString()}`);
        if (!response.ok) throw new Error('Network response was not ok');
        return await response.json();
    } catch (error) {
        console.error('Error fetching graph data:', error);
        return { nodes: [], links: [] };
    }
};

export const fetchProjects = async () => {
    try {
        const response = await fetch('http://localhost:5000/api/projects');
        if (!response.ok) throw new Error('Network response was not ok');
        return await response.json();
    } catch (error) {
        console.error('Error fetching projects:', error);
        return [];
    }
};

export const fetchSkills = async () => {
    try {
        const response = await fetch('http://localhost:5000/api/skills');
        if (!response.ok) throw new Error('Network response was not ok');
        return await response.json();
    } catch (error) {
        console.error('Error fetching skills:', error);
        return {};
    }
};

export const fetchProjectFit = async (skills) => {
    try {
        const response = await fetch('http://localhost:5000/api/project-fit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ skills }),
        });
        if (!response.ok) throw new Error('Network response was not ok');
        return await response.json();
    } catch (error) {
        console.error('Error fetching project fit:', error);
        return [];
    }
};

export const fetchCommGap = async (dept1, dept2) => {
    try {
        const response = await fetch(`http://localhost:5000/api/comm-gap?dept1=${dept1}&dept2=${dept2}`);
        if (!response.ok) throw new Error('Network response was not ok');
        return await response.json();
    } catch (error) {
        console.error('Error fetching comm gap:', error);
        return [];
    }
};
