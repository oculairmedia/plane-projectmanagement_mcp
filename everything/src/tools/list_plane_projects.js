import axios from 'axios';

async function listPlaneProjects(server, args) {
    try {
        console.log('[DEBUG] listPlaneProjects called with args:', args);
        // Configuration
        const API_KEY = process.env.PLANE_API_KEY || "plane_api_614f7240a5df4177840558c34bddb668";
        const BASE_URL = process.env.PLANE_BASE_URL || "http://192.168.50.90/api/v1";
        const WORKSPACE_SLUG = process.env.PLANE_WORKSPACE_SLUG || "test-space";

        const headers = {
            "X-API-Key": API_KEY,
            "Content-Type": "application/json"
        };

        const url = `${BASE_URL}/workspaces/${WORKSPACE_SLUG}/projects/`;
        console.log(`[DEBUG] Calling Plane API: GET ${url}`);
        const response = await axios.get(url, { headers });
        console.log(`[DEBUG] Plane API response status: ${response.status}`);

        if (response.status === 200) {
            const projects = response.data.results || [];
            const project_info = projects.map(p => `${p.name} (ID: ${p.id})`);
            const resultText = JSON.stringify({ projects: "Projects:\n" + project_info.join("\n") }, null, 2);
            return { content: [{ type: 'text', text: resultText }] };
        }
        const errorText = JSON.stringify({ error: `Error: API request failed with status code ${response.status}` });
        return { content: [{ type: 'text', text: errorText }], isError: true };

    } catch (e) {
        console.error('[DEBUG] Error in listPlaneProjects:', e);
        if (axios.isAxiosError(e)) {
            console.error('[DEBUG] Axios error details:', e.response?.data || e.message);
            const networkErrorText = JSON.stringify({ error: `Error: Network error - ${e.message}` });
            return { content: [{ type: 'text', text: networkErrorText }], isError: true };
        }
        console.error('[DEBUG] Unexpected error details:', e);
        const unexpectedErrorText = JSON.stringify({ error: `Error: Unexpected error - ${e.message}` });
        return { content: [{ type: 'text', text: unexpectedErrorText }], isError: true };
    }
}

export const listPlaneProjectsToolDefinition = {
    name: 'list_plane_projects',
    description: 'List projects in the Plane project management system.',
    inputSchema: {
        type: 'object',
        properties: {},
        required: [],
    },
};

export const list_plane_projects = {
  handler: listPlaneProjects,
  definition: listPlaneProjectsToolDefinition
}
