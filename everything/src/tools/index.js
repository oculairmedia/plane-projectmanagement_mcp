import { create_plane_issue } from './create_plane_issue.js';
import { create_plane_project } from './create_plane_project.js';
import { delete_plane_project } from './delete_plane_project.js';
import { get_plane_issue_id } from './get_plane_issue_id.js';
import { list_plane_issues } from './list_plane_issues.js';
import { list_plane_projects } from './list_plane_projects.js';
import { update_plane_issue } from './update_plane_issue.js';
import { update_plane_project } from './update_plane_project.js';
import { CallToolRequestSchema, ListToolsRequestSchema, McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

const planeToolDefinitions = [
    create_plane_issue.definition,
    create_plane_project.definition,
    delete_plane_project.definition,
    get_plane_issue_id.definition,
    list_plane_issues.definition,
    list_plane_projects.definition,
    update_plane_issue.definition,
    update_plane_project.definition
];

const planeToolHandlers = {
    create_plane_issue: create_plane_issue.handler,
    create_plane_project: create_plane_project.handler,
    delete_plane_project: delete_plane_project.handler,
    get_plane_issue_id: get_plane_issue_id.handler,
    list_plane_issues: list_plane_issues.handler,
    list_plane_projects: list_plane_projects.handler,
    update_plane_issue: update_plane_issue.handler,
    update_plane_project: update_plane_project.handler
};

/**
 * Register all tool handlers with the server
 * @param {Object} server - The GhostServer instance
 */
export function registerToolHandlers(server) {
    // Register tool definitions
    server.server.setRequestHandler(ListToolsRequestSchema, async () => ({
        tools: planeToolDefinitions,
    }));

    // Register tool call handler
    server.server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const handler = planeToolHandlers[request.params.name];

        if (handler) {
            return handler(server, request.params.arguments);
        } else {
            throw new McpError(
                ErrorCode.MethodNotFound,
                `Unknown tool: ${request.params.name}`
            );
        }
    });
}

// Export all tool definitions
export const toolDefinitions = planeToolDefinitions;

// Export all tool handlers
export const toolHandlers = planeToolHandlers;

/**
 * Returns a formatted list of all available Plane tools with their descriptions
 * @returns {Array} Array of objects containing tool name and description
 */
export function getToolsList() {
    return planeToolDefinitions.map(tool => ({
        name: tool.name,
        description: tool.description
   }));
}

/**
 * Logs all available Plane tools to the console
 */
export function showTools() {
    console.log('Available Plane Tools:');
    console.log('=====================');

    planeToolDefinitions.forEach(tool => {
        console.log(`- ${tool.name}: ${tool.description}`);
    });
}