#!/usr/bin/env node
import dotenv from 'dotenv';
import { PlaneServer } from './core/server.js';
import { registerToolHandlers } from './tools/index.js';
import { runStdio, runSSE } from './transports/index.js';

// Load environment variables
dotenv.config();

/**
 * Initialize and run the Ghost MCP server
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