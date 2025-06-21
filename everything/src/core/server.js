#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';
import crypto from 'crypto';

/**
 * Core PlaneServer class that handles initialization
 */
export class PlaneServer {
    /**
     * Initialize the Plane MCP server
     */
    constructor() {
        // Initialize MCP server
        this.server = new Server({
            name: 'plane-server',
            version: '0.1.0',
        }, {
            capabilities: {
                tools: {},
            },
        });

        // Set up error handler
        this.server.onerror = (error) => console.error('[MCP Error]', error);

        // Initialize API configuration
        this.apiKey = process.env.PLANE_API_KEY;
        this.baseUrl = process.env.PLANE_BASE_URL || 'http://192.168.50.90/api/v1';
        this.workspace = process.env.PLANE_WORKSPACE_SLUG || 'test-space';
        
        if (!this.apiKey) {
            console.warn('Warning: PLANE_API_KEY environment variable not set');
        }
        
        // Each tool will handle its own axios instance
    }

    /**
     * Create a standard error response
     * @param {Error} error - The error object
     * @returns {Object} Formatted error response
     */
    createErrorResponse(error) {
        console.error('Error in tool handler:', error);
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    success: false,
                    error: error.message,
                    details: error.response?.data || error,
                }, null, 2),
            }],
            isError: true,
        };
    }
}