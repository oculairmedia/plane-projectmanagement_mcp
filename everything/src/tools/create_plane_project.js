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

        // Validate identifier format (uppercase letters, numbers, no spaces)
        if (!/^[A-Z0-9]+$/.test(params.identifier)) {
            const errorText = JSON.stringify({ error: "Error: Project identifier must contain only uppercase letters and numbers (e.g., 'PROJ', 'BOOK1')" });
            return { content: [{ type: 'text', text: errorText }], isError: true };
        }

        // Warn if identifier is very long (might be rejected by some Plane instances)
        if (params.identifier.length > 10) {
            console.warn(`[WARNING] Project identifier '${params.identifier}' is quite long. Some Plane instances may have stricter limits.`);
        }

        // Validate that only allowed parameters are present
        const allowedParams = ['name', 'identifier', 'description', 'network'];
        const knownIgnoredParams = ['request_heartbeat']; // Parameters we know about but don't use

        // Filter out parameters that are neither allowed nor known to be ignored
        const unexpectedParams = Object.keys(params).filter(key =>
            !allowedParams.includes(key) && !knownIgnoredParams.includes(key)
        );

        if (unexpectedParams.length > 0) {
            const errorText = JSON.stringify({ error: `Error: Unexpected parameters: ${unexpectedParams.join(', ')}. Allowed parameters are: ${allowedParams.join(', ')}` });
            return { content: [{ type: 'text', text: errorText }], isError: true };
        }

        // Log a warning about ignored parameters
        const ignoredParams = Object.keys(params).filter(key => knownIgnoredParams.includes(key));
        if (ignoredParams.length > 0) {
            console.warn(`[WARNING] The following parameters will be ignored: ${ignoredParams.join(', ')}`);
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
        console.log(`[DEBUG] Calling Plane API: POST ${url}`);
        console.log(`[DEBUG] Project data:`, project_data);

        const response = await axios.post(url, project_data, { headers });
        console.log(`[DEBUG] Plane API response status: ${response.status}`);

        if (response.status === 201) {
            const result = response.data;
            const resultText = JSON.stringify({ message: `Project created: ${result.name} (${result.identifier})`, project: result }, null, 2);
            return { content: [{ type: 'text', text: resultText }] };
        }
        const errorText = JSON.stringify({ error: `Error: API request failed with status code ${response.status}` });
        return { content: [{ type: 'text', text: errorText }], isError: true };
    } catch (error) {
        console.error("[ERROR]", error);

        // Check if this is an Axios error with response data
        if (error.response && error.response.data) {
            // Extract detailed error information from the API response
            const apiErrorDetails = typeof error.response.data === 'object'
                ? JSON.stringify(error.response.data, null, 2)
                : error.response.data;

            const errorText = JSON.stringify({
                error: `API Error (${error.response.status}): ${error.message}`,
                details: apiErrorDetails
            }, null, 2);

            return { content: [{ type: 'text', text: errorText }], isError: true };
        }

        // Default error handling
        const errorText = JSON.stringify({ error: `Error: ${error.message}` });
        return { content: [{ type: 'text', text: errorText }], isError: true };
    }
}

export const createPlaneProjectToolDefinition = {
    name: 'create_plane_project',
    description: 'Create a new project in the Plane project management system. The project identifier must contain only uppercase letters and numbers.',
    inputSchema: {
        type: 'object',
        properties: {
            name: {
                type: 'string',
                description: 'Project Name (e.g., "My New Project")',
            },
            identifier: {
                type: 'string',
                description: 'Project identifier - must contain only uppercase letters and numbers (e.g., "PROJ", "BOOK1", "BOOKSTACK")',
            },
            description: {
                type: 'string',
                description: 'Project description (Optional)',
            },
            network: {
                type: 'number',
                description: '0 for private, 2 for public (Optional, defaults to 2)'
                // Removed enum: [0, 2] as it causes encoding issues with Letta
            },
        },
        required: ['name', 'identifier'],
        additionalProperties: false
    },
    examples: [
        {
            name: 'Marketing Project',
            identifier: 'MKTG',
            description: 'Project for marketing team tasks',
            network: 2
        },
        {
            name: 'Development Project',
            identifier: 'DEV',
            description: 'Project for development tasks'
        },
        {
            name: 'Bookstack Project',
            identifier: 'BOOKSTACK',
            description: 'Project for Bookstack documentation'
        }
    ]
};

export const create_plane_project = {
  handler: createPlaneProject,
  definition: createPlaneProjectToolDefinition
}
