#!/usr/bin/env node
import dotenv from 'dotenv';
import { PlaneServer } from './src/core/server.js';
import { registerToolHandlers } from './src/tools/index.js';
import { runStdio, runSSE } from './src/transports/index.js';

// Load environment variables
dotenv.config();

/**
 * Initialize and run the Plane MCP server
 */
async function main() {
    try {
        // Create server instance
        const server = new PlaneServer();

        // Register all tool handlers
        registerToolHandlers(server.server);

        // Determine transport mode from command line arguments
        const useSSE = process.argv.includes('--sse');

        // Run server with appropriate transport
        if (useSSE) {
            console.log('Starting Plane server with SSE transport');
            await runSSE(server);
        } else {
            console.log('Starting Plane server with stdio transport');
            await runStdio(server);
        }
    } catch (error) {
        console.error('Failed to start Plane server:', error);
        process.exit(1);
    }
}

// Run the server
main().catch(console.error);
