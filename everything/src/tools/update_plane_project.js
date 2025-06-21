import axios from 'axios';

async function updatePlaneProject(server, args) {
    console.log("updatePlaneProject called with args:", args);
    try {
        // Parse parameters - handle both string and object inputs
        let params;
        if (typeof args === 'string') {
            try {
                params = JSON.parse(args);
            } catch (parseError) {
                console.error("[ERROR] Failed to parse JSON args:", parseError);
                const errorText = JSON.stringify({ error: "Error: Invalid JSON input", details: parseError.message });
                return { content: [{ type: 'text', text: errorText }], isError: true };
            }
        } else {
            params = args || {};
        }

        // Remove any metadata fields that might be included by LLM frameworks
        const metadataFields = ['inner_thoughts', 'request_heartbeat'];
        metadataFields.forEach(field => {
            if (params[field] !== undefined) {
                console.log(`[INFO] Removing metadata field: ${field}`);
                delete params[field];
            }
        });

        // Validate required parameters with detailed error messages
        if (!params.project_id) {
            const errorText = JSON.stringify({
                error: "Error: Project ID is required",
                details: "Please provide a valid project_id parameter. This should be a UUID like '7d26d935-6546-46fd-abb7-368635f5b5ef'.",
                example: { project_id: "7d26d935-6546-46fd-abb7-368635f5b5ef", name: "Updated Project Name" }
            });
            return { content: [{ type: 'text', text: errorText }], isError: true };
        }

        // Validate that project_id is a valid UUID
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(params.project_id)) {
            const errorText = JSON.stringify({
                error: "Error: Project ID must be a valid UUID",
                details: "The project_id must be in UUID format (e.g., '7d26d935-6546-46fd-abb7-368635f5b5ef').",
                provided_value: params.project_id
            });
            return { content: [{ type: 'text', text: errorText }], isError: true };
        }

        // Validate that at least one update parameter is provided
        const updateableParams = ['name', 'description', 'network', 'identifier'];
        const hasUpdateParams = updateableParams.some(param => params[param] !== undefined);

        if (!hasUpdateParams) {
            const errorText = JSON.stringify({
                error: "Error: At least one update parameter is required",
                valid_params: updateableParams.join(', '),
                details: "You must provide at least one parameter to update. Valid parameters are: name, description, network, or identifier.",
                example: { project_id: "7d26d935-6546-46fd-abb7-368635f5b5ef", name: "New Project Name" }
            });
            return { content: [{ type: 'text', text: errorText }], isError: true };
        }

        // Log what parameters are being updated
        const updatingParams = updateableParams.filter(param => params[param] !== undefined);
        console.log(`[INFO] Updating project with ID ${params.project_id}. Updating fields: ${updatingParams.join(', ')}`);


        // Validate identifier format if provided
        if (params.identifier) {
            if (!/^[A-Z0-9]+$/.test(params.identifier)) {
                const errorText = JSON.stringify({
                    error: "Error: Project identifier must contain only uppercase letters and numbers",
                    details: "The identifier must contain only uppercase letters (A-Z) and numbers (0-9).",
                    examples: ["PROJ", "BOOK1", "TEST123"],
                    provided_value: params.identifier
                });
                return { content: [{ type: 'text', text: errorText }], isError: true };
            }

            // Warn if identifier is very long (might be rejected by some Plane instances)
            if (params.identifier.length > 10) {
                console.warn(`[WARNING] Project identifier '${params.identifier}' is quite long. Some Plane instances may have stricter limits.`);
            }

            console.log(`[INFO] Updating project identifier to: ${params.identifier}`);
        }

        // Validate network value if provided
        if (params.network !== undefined) {
            // Convert string to number if needed (handles cases where network is passed as a string)
            if (typeof params.network === 'string') {
                params.network = parseInt(params.network, 10);
                console.log(`[INFO] Converted network value from string to number: ${params.network}`);
            }

            if (![0, 2].includes(params.network)) {
                const errorText = JSON.stringify({
                    error: "Error: Network value must be 0 (private) or 2 (public)",
                    details: "The network parameter must be either 0 (for private projects) or 2 (for public projects).",
                    provided_value: params.network
                });
                return { content: [{ type: 'text', text: errorText }], isError: true };
            }

            console.log(`[INFO] Setting project visibility to: ${params.network === 0 ? 'private' : 'public'}`);
        }

        // Validate that only allowed parameters are present
        const allowedParams = ['project_id', 'name', 'identifier', 'description', 'network'];
        const knownIgnoredParams = [
            'request_heartbeat',  // Common parameter from LLM frameworks
            'inner_thoughts',     // Common parameter from LLM frameworks
            'function',           // Common parameter from LLM frameworks
            'id',                 // Common parameter from LLM frameworks
            'type'                // Common parameter from LLM frameworks
        ];

        // Filter out parameters that are neither allowed nor known to be ignored
        const unexpectedParams = Object.keys(params).filter(key =>
            !allowedParams.includes(key) && !knownIgnoredParams.includes(key)
        );

        if (unexpectedParams.length > 0) {
            const errorText = JSON.stringify({
                error: `Error: Unexpected parameters detected`,
                details: `The following parameters are not recognized: ${unexpectedParams.join(', ')}`,
                allowed_parameters: allowedParams,
                unexpected_parameters: unexpectedParams
            });
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

        // Prepare update data
        const update_data = { ...params };
        delete update_data.project_id; // Remove project_id from update data

        // If description is updated, also update HTML version
        if (update_data.description !== undefined) {
            update_data.description_html = `<p>${update_data.description || ""}</p>`;
        }

        const url = `${BASE_URL}/workspaces/${WORKSPACE_SLUG}/projects/${params.project_id}/`;
        console.log(`[DEBUG] Calling Plane API: PATCH ${url}`);
        console.log(`[DEBUG] Update data:`, update_data);

        const response = await axios.patch(url, update_data, { headers });
        console.log(`[DEBUG] Plane API response status: ${response.status}`);

        if (response.status === 200) {
            const result = response.data;

            // Track what was changed
            const changes = [];
            if (update_data.name !== undefined) {
                changes.push("name updated");
            }
            if (update_data.description !== undefined) {
                changes.push("description updated");
            }
            if (update_data.identifier !== undefined) {
                changes.push("identifier updated");
            }
            if (update_data.network !== undefined) {
                changes.push(`visibility set to ${update_data.network === 0 ? 'private' : 'public'}`);
            }

            const change_text = changes.length > 0 ? ` - ${changes.join(", ")}` : "";
            const resultText = JSON.stringify({
                message: `Project updated: ${result.name} (${result.identifier})${change_text}`,
                project: result
            }, null, 2);

            return { content: [{ type: 'text', text: resultText }] };
        }

        const errorText = JSON.stringify({ error: `Error: API request failed with status code ${response.status}` });
        return { content: [{ type: 'text', text: errorText }], isError: true };
    } catch (e) {
        console.error("[ERROR] in updatePlaneProject:", e.message);
        // Simplified error handling to prevent crashes from stringifying bad responses
        let errorMsg = `Error: Unexpected error - ${e.message}`;
        if (axios.isAxiosError(e)) {
            if (e.response) {
                // Got a response, but it was an error status
                 errorMsg = `Error: API request failed with status ${e.response.status} - ${e.message}`;
                 // Log the response data if available, but don't rely on stringifying it for the return value
                 if (e.response.data) {
                    console.error("API Error Response Body:", e.response.data);
                 }
            } else if (e.request) {
                 // Request was made but no response received
                 errorMsg = `Error: Network error - ${e.message}`;
            } else {
                 // Something else happened setting up the request
                 errorMsg = `Error: Axios setup error - ${e.message}`;
            }
        }
        const errorText = JSON.stringify({ error: errorMsg });
        return { content: [{ type: 'text', text: errorText }], isError: true };
    }
}

export const updatePlaneProjectToolDefinition = {
    name: 'update_plane_project',
    description: 'Update an existing project in the Plane project management system.',
    inputSchema: {
        type: 'object',
        properties: {
            project_id: {
                type: 'string',
                description: 'UUID of the project to update',
            },
            name: {
                type: 'string',
                description: 'New project name (Optional)',
            },
            identifier: {
                type: 'string',
                description: 'New project identifier - must contain only uppercase letters and numbers (e.g., "PROJ", "BOOK1") (Optional)',
            },
            description: {
                type: 'string',
                description: 'New project description (Optional)',
            },
            network: {
                type: 'number',
                description: '0 for private, 2 for public (Optional)'
                // Removed enum: [0, 2] as it causes encoding issues with Letta
            },
        },
        required: ['project_id'],
        additionalProperties: false
    },
    examples: [
        {
            project_id: "7d26d935-6546-46fd-abb7-368635f5b5ef",
            name: "Updated Project Name"
        },
        {
            project_id: "7d26d935-6546-46fd-abb7-368635f5b5ef",
            description: "Updated project description with more details"
        },
        {
            project_id: "7d26d935-6546-46fd-abb7-368635f5b5ef",
            identifier: "NEWID",
            network: 0
        }
    ]
};

export const update_plane_project = {
  handler: updatePlaneProject,
  definition: updatePlaneProjectToolDefinition
}
