import axios from 'axios';

async function listPlaneIssues(server, args) {
    try {
        // Parse parameters
        const params = args || {};

        // Validate required parameters
        if (!params.project_id) {
            const errorText = JSON.stringify({ error: "Error: Project ID is required" });
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

        // Get project details first
        const project_url = `${BASE_URL}/workspaces/${WORKSPACE_SLUG}/projects/${params.project_id}/`;
        const project_response = await axios.get(project_url, { headers });
        if (project_response.status !== 200) {
            const errorText = JSON.stringify({ error: `Error: Failed to get project details - ${project_response.status}` });
            return { content: [{ type: 'text', text: errorText }], isError: true };
        }

        const project = project_response.data;

        // Get issues
        const issues_url = `${BASE_URL}/workspaces/${WORKSPACE_SLUG}/projects/${params.project_id}/issues/`;
        const response = await axios.get(issues_url, { headers });

        if (response.status === 200) {
            let issues = response.data.results || [];
            if (!issues) {
                const resultText = JSON.stringify({message: `No issues found in project ${project.name}`});
                return { content: [{ type: 'text', text: resultText }] };
            }

            // Filter issues based on parameters
            if (params.state_id) {
                issues = issues.filter(i => i.state === params.state_id);
            }
            if (params.priority) {
                issues = issues.filter(i => i.priority === params.priority);
            }
            if (params.assignee_id) {
                issues = issues.filter(i => i.assignees && i.assignees.includes(params.assignee_id));
            }
            if (params.label_id) {
                issues = issues.filter(i => i.labels && i.labels.includes(params.label_id));
            }

            if (issues.length === 0) {
                const resultText = JSON.stringify({message: "No issues match the specified filters"});
                return { content: [{ type: 'text', text: resultText }] };
            }

            // Format output
            const output = [`Issues in ${project.name}:`];
            for (const issue of issues) {
                const priority_text = issue.priority !== "none" ? ` - ${issue.priority.charAt(0).toUpperCase() + issue.priority.slice(1)} Priority` : "";
                const state_text = issue.state_detail ? ` - ${issue.state_detail.name || 'Unknown State'}` : ' - Unknown State';
                output.push(`${issue.sequence_id}. ${issue.name}${priority_text}${state_text}`);
            }

            const resultText = JSON.stringify({issues: output.join("\n")}, null, 2);
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

export const listPlaneIssuesToolDefinition = {
    name: 'list_plane_issues_v2',
    description: 'List issues in a Plane project with optional filtering.',
    inputSchema: {
        type: 'object',
        properties: {
            project_id: {
                type: 'string',
                description: 'UUID of the project',
            },
            state_id: {
                type: 'string',
                description: 'UUID of the state (Optional)',
            },
            priority: {
                type: 'string',
                description: 'Issue priority (none, low, medium, high, urgent) (Optional)',
            },
            assignee_id: {
                type: 'string',
                description: 'UUID of the assignee (Optional)',
            },
            label_id: {
                type: 'string',
                description: 'UUID of the label (Optional)',
            },
        },
        required: ['project_id'],
    },
};

export const list_plane_issues_v2 = {
  handler: listPlaneIssues,
  definition: listPlaneIssuesToolDefinition
}