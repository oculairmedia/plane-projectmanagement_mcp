import axios from 'axios';
import { get_plane_issue_id } from './get_plane_issue_id.js'; // Import the corrected handler

// Removed duplicated getPlaneIssueId function
async function updatePlaneIssue(server, args) { // Add server parameter
    try {
        // Parse parameters
        const params = args || {};

        // Validate required parameters
        if (!params.project_id) {
            const errorText = JSON.stringify({ error: "Error: Project ID is required" });
            return { content: [{ type: 'text', text: errorText }], isError: true };
        }
        if (!params.issue_id) {
            const errorText = JSON.stringify({ error: "Error: Issue ID is required" });
            return { content: [{ type: 'text', text: errorText }], isError: true };
        }

        // Check if issue_id is a UUID, if not, try to resolve it
        let issue_id = params.issue_id;
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(issue_id)) {
            // Try to resolve the issue ID
            // Call the imported handler, passing the server instance and args
            const resolution_result = await get_plane_issue_id.handler(server, { issue_code: issue_id });

            if (resolution_result.isError || !resolution_result.content || resolution_result.content.length === 0) {
                 const errorDetail = resolution_result.content?.[0]?.text || 'Unknown error during resolution';
                 const errorText = JSON.stringify({ error: `Error: Could not resolve issue code ${issue_id} to a UUID. Details: ${errorDetail}` });
                 return { content: [{ type: 'text', text: errorText }], isError: true };
            }

            try {
                 const resolution_data = JSON.parse(resolution_result.content[0].text);
                 if (resolution_data.issue_id && resolution_data.project_id) {
                     params.issue_id = resolution_data.issue_id; // Update issue_id with the resolved UUID
                     // Ensure project_id from params matches the resolved one, or use the resolved one if not provided initially
                     if (!params.project_id || params.project_id === resolution_data.project_id) {
                        params.project_id = resolution_data.project_id;
                     } else {
                         const errorText = JSON.stringify({ error: `Error: Resolved project ID (${resolution_data.project_id}) does not match provided project ID (${params.project_id}) for issue code ${issue_id}` });
                         return { content: [{ type: 'text', text: errorText }], isError: true };
                     }
                 } else {
                     const errorText = JSON.stringify({ error: `Error: Could not resolve issue code ${issue_id} to a UUID. Details: ${resolution_result.content[0].text}` });
                     return { content: [{ type: 'text', text: errorText }], isError: true };
                 }
             } catch (e) {
                 const errorText = JSON.stringify({ error: `Error parsing resolution result for ${issue_id}. Details: ${resolution_result.content[0].text}` });
                 return { content: [{ type: 'text', text: errorText }], isError: true };
             }
        }


        // Configuration
        const API_KEY = process.env.PLANE_API_KEY || "plane_api_614f7240a5df4177840558c34bddb668";
        const BASE_URL = process.env.PLANE_BASE_URL || "http://192.168.50.90/api/v1";
        const WORKSPACE_SLUG = process.env.PLANE_WORKSPACE_SLUG || "test-space";

        const headers = {
            "X-API-Key": API_KEY,
            "Content-Type": "application/json"
        };

        // Remove required fields from update data
        const update_data = { ...params };
        delete update_data.project_id;
        delete update_data.issue_id;

        // If description is updated, also update HTML version
        if (update_data.description) {
            update_data.description_html = `<p>${update_data.description}</p>`;
        }

        if (Object.keys(update_data).length === 0) {
            const errorText = JSON.stringify({ error: "Error: No update parameters provided" });
            return { content: [{ type: 'text', text: errorText }], isError: true };
        }

        const url = `${BASE_URL}/workspaces/${WORKSPACE_SLUG}/projects/${params.project_id}/issues/${params.issue_id}/`;
        const response = await axios.patch(url, update_data, { headers });

        if (response.status === 200) {
            const result = response.data;
            const changes = [];
            if (update_data.state_id) {
                changes.push("status changed");
            }
            if (update_data.name) {
                changes.push("title updated");
            }
            if (update_data.description) {
                changes.push("description updated");
            }
            if (update_data.priority) {
                changes.push(`priority set to ${update_data.priority}`);
            }
            if (update_data.assignee_ids) {
                changes.push("assignees updated");
            }

            const change_text = changes.length > 0 ? ` - ${changes.join(", ")}` : "";
            const resultText = JSON.stringify({ message: `Issue updated: ${result.name} (#${result.sequence_id})${change_text}`, issue: result }, null, 2);
            return { content: [{ type: 'text', text: resultText }] };
        }
        const errorText = JSON.stringify({ error: `Error: API request failed with status code ${response.status}` });
        return { content: [{ type: 'text', text: errorText }], isError: true };

    } catch (e) {
        if (axios.isAxiosError(e)) {
            const networkErrorText = JSON.stringify({ error: `Error: Network error - ${e.message}` });
            return { content: [{ type: 'text', text: networkErrorText }], isError: true };
        }
        const unexpectedErrorText = JSON.stringify({ error: `Error: Unexpected error - ${e.message}` });
        return { content: [{ type: 'text', text: unexpectedErrorText }], isError: true };
    }
}

export const updatePlaneIssueToolDefinition = {
    name: 'update_plane_issue_v2',
    description: 'Update an existing issue in a Plane project.',
    inputSchema: {
        type: 'object',
        properties: {
            project_id: {
                type: 'string',
                description: 'UUID of the project',
            },
            issue_id: {
                type: 'string',
                description: 'UUID of the issue or issue code (e.g., PROJ-123)',
            },
            state_id: {
                type: 'string',
                description: 'UUID of the state (Optional)',
            },
            name: {
                type: 'string',
                description: 'New title (Optional)',
            },
            description: {
                type: 'string',
                description: 'New description (Optional)',
            },
            priority: {
                type: 'string',
                description: 'Issue priority (none, low, medium, high, urgent) (Optional)',
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
        required: ['project_id', 'issue_id'],
    },
};

export const update_plane_issue_v2 = {
  handler: updatePlaneIssue,
  definition: updatePlaneIssueToolDefinition
}