import axios from 'axios';

async function createPlaneIssue(server, args) {
    try {
        // Parse parameters - no need for explicit JSON parsing, as args is already an object
        const params = args || {};

        // Validate required parameters
        if (!params.project_id) {
            const errorText = JSON.stringify({ error: "Error: Project ID is required" });
            return { content: [{ type: 'text', text: errorText }], isError: true };
        }
        if (!params.name) {
            const errorText = JSON.stringify({ error: "Error: Issue name is required" });
            return { content: [{ type: 'text', text: errorText }], isError: true };
        }

        // Configuration
        const API_KEY = process.env.PLANE_API_KEY || "plane_api_614f7240a5df4177840558c34bddb668";
        const BASE_URL = process.env.PLANE_BASE_URL || "http://192.168.50.90/api/v1";
        const WORKSPACE_SLUG = process.env.PLANE_WORKSPACE_SLUG || "test-space";

        const headers = {
            "X-API-Key": API_KEY,
            "Content-Type": "application/json"
        };

        // Prepare issue data
        const issue_data = {
            name: params.name,
            description: params.description || "",
            description_html: `<p>${params.description || ""}</p>`,
            priority: params.priority || "none"
        };

        // Add optional fields if provided
        const optional_fields = [
            "state_id", "assignee_ids", "label_ids",
            "start_date", "target_date"
        ];
        for (const field of optional_fields) {
            if (params[field]) {
                issue_data[field] = params[field];
            }
        }

        const url = `${BASE_URL}/workspaces/${WORKSPACE_SLUG}/projects/${params.project_id}/issues/`;

        const response = await axios.post(url, issue_data, { headers });

        if (response.status === 201) {
            const result = response.data;
            const resultText = JSON.stringify({ message: `Issue created: ${result.name} (#${result.sequence_id})`, issue: result }, null, 2);
            return { content: [{ type: 'text', text: resultText }] };
        }
        const errorText = JSON.stringify({ error: `Error: API request failed with status code ${response.status}` });
        return { content: [{ type: 'text', text: errorText }], isError: true };
    } catch (error) {
        const errorText = JSON.stringify({ error: `Error: ${error.message}` });
        return { content: [{ type: 'text', text: errorText }], isError: true };
    }
}

export const createPlaneIssueToolDefinition = {
    name: 'create_plane_issue',
    description: 'Create a new issue in a Plane project.',
    inputSchema: {
        type: 'object',
        properties: {
            project_id: {
                type: 'string',
                description: 'UUID of the project',
            },
            name: {
                type: 'string',
                description: 'Issue title',
            },
            description: {
                type: 'string',
                description: 'Issue description',
            },
            priority: {
                type: 'string',
                description: 'Issue priority (none, low, medium, high, urgent)',
            },
            state_id: {
                type: 'string',
                description: 'UUID of the state (Optional)',
            },
            assignee_ids: {
                type: 'array',
                items: { type: 'string' },
                description: 'Array of user UUIDs (Optional)',
            },
            label_ids: {
                type: 'array',
                items: { type: 'string' },
                description: 'Array of label UUIDs (Optional)',
            },
            start_date: {
                type: 'string',
                description: 'Start date in YYYY-MM-DD format (Optional)',
            },
            target_date: {
                type: 'string',
                description: 'Target date in YYYY-MM-DD format (Optional)',
            },
        },
        required: ['project_id', 'name'],
    },
};

export const create_plane_issue = {
  handler: createPlaneIssue,
  definition: createPlaneIssueToolDefinition
}
