import axios from 'axios';

async function createPlaneProject(server, args) {
    console.log("createPlaneProject called with args:", args);
    try {
        // Parse parameters
        const params = args || {};

        // Validate required parameters
        if (!params.name) {
            const errorText = JSON.stringify({ error: "Error: Project name is required" });
            return { content: [{ type: 'text', text: errorText }], isError: true };
        }
        if (!params.identifier) {
            const errorText = JSON.stringify({ error: "Error: Project identifier is required" });
            return { content: [{ type: 'text', text: errorText }], isError: true };
        }

        // Configuration
        const API_KEY = process.env.PLANE_API_KEY;
        const BASE_URL = process.env.PLANE_BASE_URL || "http://192.168.50.90/api/v1";
        const WORKSPACE_SLUG = process.env.PLANE_WORKSPACE_SLUG || "test-space";

        console.log("API_KEY:", API_KEY);
        console.log("BASE_URL:", BASE_URL);
        console.log("WORKSPACE_SLUG:", WORKSPACE_SLUG);

        const headers = {
            "X-API-Key": API_KEY,
            "Content-Type": "application/json"
        };

        // Set default values
        const project_data = {
            name: params.name,
            identifier: params.identifier,
            description: params.description || "",
            network: params.network || 2  // Default to public
        };

        const url = `${BASE_URL}/workspaces/${WORKSPACE_SLUG}/projects/`;
        console.log("Making request to:", url);
        console.log("Request data:", project_data);
        const response = await axios.post(url, project_data, { headers });
        console.log("Response status:", response.status);
        console.log("Response data:", response.data);

        if (response.status === 201) {
            const result = response.data;
            const resultText = JSON.stringify({ message: `Project created: ${result.name} (${result.identifier})`, project: result }, null, 2);
            return { content: [{ type: 'text', text: resultText }] };
        }
        const errorText = JSON.stringify({ error: `Error: API request failed with status code ${response.status}` });
        return { content: [{ type: 'text', text: errorText }], isError: true };

    } catch (e) {
        console.error("Error in createPlaneProject:", e);
        if (axios.isAxiosError(e)) {
            const networkErrorText = JSON.stringify({ error: `Error: Network error - ${e.message}` });
            return { content: [{ type: 'text', text: networkErrorText }], isError: true };
        }
        const unexpectedErrorText = JSON.stringify({ error: `Error: Unexpected error - ${e.message}` });
        return { content: [{ type: 'text', text: unexpectedErrorText }], isError: true };
    }
}

export const createPlaneProjectToolDefinition = {
    name: 'create_plane_project_v2',
    description: 'Create a new project in the Plane project management system.',
    inputSchema: {
        type: 'object',
        properties: {
            name: {
                type: 'string',
                description: 'Project Name',
            },
            identifier: {
                type: 'string',
                description: 'Project identifier',
            },
            description: {
                type: 'string',
                description: 'Project description',
            },
            network: {
                type: 'number',
                description: '0 for private, 2 for public (Optional)',
            },
        },
        required: ['name', 'identifier'],
    },
    return_char_limit: 1000000,
};

export const create_plane_project_v2 = {
  handler: createPlaneProject,
  definition: createPlaneProjectToolDefinition
}