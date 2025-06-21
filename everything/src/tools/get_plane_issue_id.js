import axios from 'axios';
import { match } from 'assert';

async function getPlaneIssueId(server, args) {
    try {
        // Parse parameters
        const params = args || {};

        // Validate parameters
        if (!params.issue_code) {
            const errorText = JSON.stringify({ error: "Error: Issue code is required" });
            return { content: [{ type: 'text', text: errorText }], isError: true };
        }

        const issue_code = params.issue_code;

        // Parse issue code format (e.g. "CLT-37")
        const match = issue_code.match(/^([A-Za-z]+)-(\d+)$/);
        if (!match) {
            const errorText = JSON.stringify({ error: "Error: Invalid issue code format. Expected format: PROJECT_CODE-NUMBER (e.g. CLT-37)" });
            return { content: [{ type: 'text', text: errorText }], isError: true };
        }

        const project_code = match[1];
        const sequence_id = parseInt(match[2], 10);

        // Configuration
        const API_KEY = process.env.PLANE_API_KEY || "plane_api_614f7240a5df4177840558c34bddb668";
        const BASE_URL = process.env.PLANE_BASE_URL || "http://192.168.50.90/api/v1";
        const WORKSPACE_SLUG = process.env.PLANE_WORKSPACE_SLUG || "test-space";

        const headers = {
            "X-API-Key": API_KEY,
            "Content-Type": "application/json"
        };

        // First get projects to find the one matching the code
        const projects_url = `${BASE_URL}/workspaces/${WORKSPACE_SLUG}/projects`;
        const projects_response = await axios.get(projects_url, { headers });

        if (projects_response.status !== 200) {
            const errorText = JSON.stringify({ error: `Error: Failed to get projects - ${projects_response.status}` });
            return { content: [{ type: 'text', text: errorText }], isError: true };
        }

        const projects_array = projects_response.data?.results; // Access the results array
        if (!Array.isArray(projects_array)) {
            const errorText = JSON.stringify({ error: "Error: Invalid response format when fetching projects." });
            return { content: [{ type: 'text', text: errorText }], isError: true };
        }

        let project = null;

        // Find project with matching identifier
        for (const p of projects_array) { // Iterate over the correct array
            if (p.identifier && p.identifier.toUpperCase() === project_code.toUpperCase()) {
                project = p;
                break;
            }
        }

        if (!project) {
            const errorText = JSON.stringify({ error: `Error: No project found with identifier ${project_code}` });
            return { content: [{ type: 'text', text: errorText }], isError: true };
        }

        // Get issues for the project
        const issues_url = `${BASE_URL}/workspaces/${WORKSPACE_SLUG}/projects/${project.id}/issues/`;
        const issues_response = await axios.get(issues_url, { headers });

        if (issues_response.status !== 200) {
            const errorText = JSON.stringify({ error: `Error: Failed to get issues - ${issues_response.status}` });
            return { content: [{ type: 'text', text: errorText }], isError: true };
        }

        const issues_array = issues_response.data?.results; // Also apply the same logic for issues list
        if (!Array.isArray(issues_array)) {
             const errorText = JSON.stringify({ error: "Error: Invalid response format when fetching issues." });
             return { content: [{ type: 'text', text: errorText }], isError: true };
        }

        // Find issue with matching sequence_id
        for (const issue of issues_array) { // Iterate over the correct array
            if (issue.sequence_id === sequence_id) {
                const resultText = JSON.stringify({
                    issue_id: issue.id,
                    project_id: project.id,
                    name: issue.name,
                    current_state: issue.state
                }, null, 2);
                return { content: [{ type: 'text', text: resultText }] };
            }
        }

        const errorText = JSON.stringify({ error: `Error: No issue found with sequence ID ${sequence_id} in project ${project_code}` });
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

export const getPlaneIssueIdToolDefinition = {
    name: 'get_plane_issue_id',
    description: 'Get the UUID of a Plane issue using its display code (e.g. \'CLT-37\').',
    inputSchema: {
        type: 'object',
        properties: {
            issue_code: {
                type: 'string',
                description: 'Issue code in the format PROJECT_CODE-NUMBER (e.g. "CLT-37")',
            },
        },
        required: ['issue_code'],
    },
};

export const get_plane_issue_id = {
  handler: getPlaneIssueId,
  definition: getPlaneIssueIdToolDefinition
}