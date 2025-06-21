import axios from 'axios';

async function deletePlaneProject(server, args) {
    try {
        // Parse parameters
        const params = args || {};

        // Validate required parameters
        if (!params.project_id) {
            const errorText = JSON.stringify({ error: "Error: Project ID is required" });
            return { content: [{ type: 'text', text: errorText }], isError: true };
        }

        // Check confirmation
        if (!params.confirm) {
            const errorText = JSON.stringify({ error: "Error: Please confirm deletion by setting 'confirm': true" });
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

        // First get project details to confirm it exists and show what's being deleted
        const project_url = `${BASE_URL}/workspaces/${WORKSPACE_SLUG}/projects/${params.project_id}/`;
        const project_response = await axios.get(project_url, { headers });

        if (project_response.status !== 200) {
            const errorText = JSON.stringify({ error: `Error: Project not found or access denied (Status code: ${project_response.status})` });
            return { content: [{ type: 'text', text: errorText }], isError: true };
        }

        const project = project_response.data;
        const project_name = project.name || 'Unknown Project';
        const project_identifier = project.identifier || 'Unknown';

        // Delete the project
        const response = await axios.delete(project_url, { headers });

        if (response.status === 204) {  // Standard success code for DELETE
            const resultText = JSON.stringify({ message: `Project deleted successfully: ${project_name} (${project_identifier})` });
            return { content: [{ type: 'text', text: resultText }] };
        } else if (response.status === 404) {
            const errorText = JSON.stringify({ error: "Error: Project not found" });
            return { content: [{ type: 'text', text: errorText }], isError: true };
        } else if (response.status === 403) {
            const errorText = JSON.stringify({ error: "Error: Permission denied to delete project" });
            return { content: [{ type: 'text', text: errorText }], isError: true };
        } else {
            const errorText = JSON.stringify({ error: `Error: Failed to delete project (Status code: ${response.status})` });
            return { content: [{ type: 'text', text: errorText }], isError: true };
        }

    } catch (e) {
        if (axios.isAxiosError(e)) {
            const networkErrorText = JSON.stringify({ error: `Error: Network error - ${e.message}` });
            return { content: [{ type: 'text', text: networkErrorText }], isError: true };
        }
        const unexpectedErrorText = JSON.stringify({ error: `Error: Unexpected error - ${e.message}` });
        return { content: [{ type: 'text', text: unexpectedErrorText }], isError: true };
    }
}

export const deletePlaneProjectToolDefinition = {
    name: 'delete_plane_project',
    description: 'Delete a project from the Plane project management system.',
    inputSchema: {
        type: 'object',
        properties: {
            project_id: {
                type: 'string',
                description: 'UUID of the project',
            },
            confirm: {
                type: 'boolean',
                description: 'Set to true to confirm deletion (Optional)',
            },
        },
        required: ['project_id', 'confirm'],
    },
};

export const delete_plane_project = {
  handler: deletePlaneProject,
  definition: deletePlaneProjectToolDefinition
}