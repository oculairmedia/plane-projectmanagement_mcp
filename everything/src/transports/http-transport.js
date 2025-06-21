import express from 'express';
import cors from 'cors';
import { randomUUID } from 'crypto';

/**
 * Run the server using HTTP streaming transport (MCP compatible)
 * Implements the Streamable HTTP transport as per MCP protocol specification
 * @param {Object} server - The PlaneServer instance
 */
export async function runHTTP(server) {
    try {
        const app = express();
        const sessions = new Map(); // Store active sessions
        
        // Middleware
        app.use(cors({
            origin: ['http://localhost', 'http://127.0.0.1', 'http://192.168.50.90', 'https://letta.oculair.ca'],
            credentials: true
        }));
        app.use(express.json({ limit: '10mb' }));
        app.use(express.urlencoded({ extended: true }));
        
        // Request logging middleware
        app.use((req, res, next) => {
            const timestamp = new Date().toISOString();
            console.log(`[${timestamp}] ${req.method} ${req.path} - ${req.ip}`);
            next();
        });

        // Get or create session
        const getOrCreateSession = (req) => {
            const sessionId = req.headers['mcp-session-id'];
            
            if (sessionId && sessions.has(sessionId)) {
                return sessions.get(sessionId);
            }
            
            // Create new session if no ID provided
            if (!sessionId) {
                const newSessionId = randomUUID();
                const session = {
                    id: newSessionId,
                    createdAt: new Date(),
                    lastActivity: new Date()
                };
                sessions.set(newSessionId, session);
                return session;
            }
            
            return null;
        };

        // Main MCP endpoint - POST
        app.post('/mcp', async (req, res) => {
            try {
                const session = getOrCreateSession(req);
                if (!session && req.headers['mcp-session-id']) {
                    return res.status(404).json({
                        jsonrpc: '2.0',
                        error: { code: -32600, message: 'Session not found' },
                        id: req.body?.id || null
                    });
                }

                const { method, params, id } = req.body;
                console.log(`MCP request: ${method}`, params);

                let result;
                
                if (method === 'initialize') {
                    // Return server capabilities
                    result = {
                        capabilities: {
                            tools: {}
                        },
                        serverInfo: {
                            name: 'plane-server',
                            version: '0.1.0'
                        },
                        sessionId: session.id
                    };
                    
                    // Send session ID in response header
                    res.setHeader('Mcp-Session-Id', session.id);
                    
                } else if (method === 'tools/list') {
                    // Get all registered tools
                    const tools = [];
                    
                    // Access the internal tools from the MCP server
                    if (server.server._requestHandlers && server.server._requestHandlers.get('tools/list')) {
                        const toolsResponse = await server.server._requestHandlers.get('tools/list')();
                        result = toolsResponse;
                    } else {
                        result = { tools: [] };
                    }
                    
                } else if (method === 'tools/call') {
                    // Execute a tool
                    if (server.server._requestHandlers && server.server._requestHandlers.get('tools/call')) {
                        const toolResponse = await server.server._requestHandlers.get('tools/call')(params);
                        result = toolResponse;
                    } else {
                        throw new Error('Tool execution not available');
                    }
                    
                } else {
                    return res.status(400).json({
                        jsonrpc: '2.0',
                        error: { code: -32601, message: 'Method not found' },
                        id: id || null
                    });
                }

                res.json({
                    jsonrpc: '2.0',
                    result,
                    id: id || null
                });
                
            } catch (error) {
                console.error('Error handling MCP request:', error);
                res.status(500).json({
                    jsonrpc: '2.0',
                    error: {
                        code: -32603,
                        message: error.message || 'Internal server error'
                    },
                    id: req.body?.id || null
                });
            }
        });

        // MCP endpoint - GET (for SSE streaming)
        app.get('/mcp', async (req, res) => {
            const sessionId = req.headers['mcp-session-id'];
            
            if (!sessionId || !sessions.has(sessionId)) {
                return res.status(400).send('Session ID required');
            }

            // Set headers for SSE
            res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
            });

            // Send periodic heartbeat
            const heartbeat = setInterval(() => {
                res.write(':heartbeat\n\n');
            }, 30000);

            // Clean up on client disconnect
            req.on('close', () => {
                clearInterval(heartbeat);
            });

            // Keep connection alive
            res.write('data: {"type": "connected"}\n\n');
        });

        // Session deletion endpoint
        app.delete('/mcp', async (req, res) => {
            const sessionId = req.headers['mcp-session-id'];
            
            if (!sessionId || !sessions.has(sessionId)) {
                return res.status(404).json({
                    jsonrpc: '2.0',
                    error: { code: -32600, message: 'Session not found' }
                });
            }

            sessions.delete(sessionId);
            res.status(204).send();
        });
        
        // Health check endpoint
        app.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                transport: 'http',
                sessions: sessions.size,
                uptime: process.uptime(),
                timestamp: new Date().toISOString()
            });
        });
        
        // Tools listing endpoint (REST API)
        app.get('/tools', async (req, res) => {
            try {
                if (server.server._requestHandlers && server.server._requestHandlers.get('tools/list')) {
                    const toolsResponse = await server.server._requestHandlers.get('tools/list')();
                    res.json({
                        tools: toolsResponse.tools,
                        count: toolsResponse.tools.length
                    });
                } else {
                    res.json({ tools: [], count: 0 });
                }
            } catch (error) {
                console.error('Error listing tools:', error);
                res.status(500).json({
                    error: 'Failed to list tools',
                    message: error.message
                });
            }
        });
        
        // Start server
        const PORT = process.env.PORT || 3094;
        const httpServer = app.listen(PORT, () => {
            console.log(`Plane HTTP server is running on port ${PORT}`);
            console.log(`MCP endpoint: http://localhost:${PORT}/mcp`);
            console.log(`Health check: http://localhost:${PORT}/health`);
        });

        // Graceful shutdown
        const cleanup = async () => {
            console.log('Shutting down HTTP server...');
            httpServer.close();
            await server.server.close();
            process.exit(0);
        };

        process.on('SIGINT', cleanup);
        process.on('SIGTERM', cleanup);
        
    } catch (error) {
        console.error('Failed to start HTTP server:', error);
        process.exit(1);
    }
}