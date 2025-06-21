import express from 'express';
import cors from 'cors';

/**
 * Run the server using HTTP streaming transport (MCP compatible)
 * Implements the Streamable HTTP transport as per MCP protocol specification
 * @param {Object} server - The PlaneServer instance
 */
export async function runHTTP(server) {
    try {
        const app = express();
        
        // Middleware
        app.use(cors());
        app.use(express.json({ limit: '10mb' }));
        app.use(express.urlencoded({ extended: true }));
        
        // Request logging middleware
        app.use((req, res, next) => {
            const timestamp = new Date().toISOString();
            console.log(`[${timestamp}] ${req.method} ${req.path} - ${req.ip}`);
            next();
        });
        
        // Health check endpoint
        app.get('/health', (req, res) => {
            res.json({
                status: 'ok',
                transport: 'http',
                uptime: process.uptime(),
                timestamp: new Date().toISOString()
            });
        });
        
        // Tools listing endpoint
        app.get('/tools', async (req, res) => {
            try {
                // Use the server's tool listing functionality
                const toolsResponse = await server.server.request({
                    method: 'tools/list'
                });
                
                res.json({
                    tools: toolsResponse.tools,
                    count: toolsResponse.tools.length
                });
            } catch (error) {
                console.error('Error listing tools:', error);
                res.status(500).json({
                    error: 'Failed to list tools',
                    message: error.message
                });
            }
        });
        
        // Tool execution endpoint (non-streaming)
        app.post('/tools/:toolName', async (req, res) => {
            try {
                const { toolName } = req.params;
                const { arguments: toolArgs } = req.body;
                
                console.log(`Executing tool: ${toolName} with args:`, toolArgs);
                
                const result = await server.server.request({
                    method: 'tools/call',
                    params: {
                        name: toolName,
                        arguments: toolArgs || {}
                    }
                });
                
                res.json({
                    success: true,
                    result: result.content,
                    tool: toolName,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                console.error(`Error executing tool ${req.params.toolName}:`, error);
                res.status(500).json({
                    success: false,
                    error: 'Tool execution failed',
                    message: error.message,
                    tool: req.params.toolName
                });
            }
        });
        
        // Tool execution endpoint (streaming)
        app.post('/tools/:toolName/stream', async (req, res) => {
            try {
                const { toolName } = req.params;
                const { arguments: toolArgs } = req.body;
                
                console.log(`Streaming tool execution: ${toolName} with args:`, toolArgs);
                
                // Set up Server-Sent Events headers
                res.setHeader('Content-Type', 'text/event-stream');
                res.setHeader('Cache-Control', 'no-cache');
                res.setHeader('Connection', 'keep-alive');
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');
                
                // Send initial connection confirmation
                res.write(`data: ${JSON.stringify({ type: 'start', tool: toolName, timestamp: new Date().toISOString() })}\\n\\n`);
                
                // Execute the tool
                const result = await server.server.request({
                    method: 'tools/call',
                    params: {
                        name: toolName,
                        arguments: toolArgs || {}
                    }
                });
                
                // Stream the result
                if (result.content && Array.isArray(result.content)) {
                    // Handle array of content blocks
                    for (const [index, contentBlock] of result.content.entries()) {
                        const chunk = {
                            type: 'content',
                            index,
                            data: contentBlock,
                            timestamp: new Date().toISOString()
                        };
                        res.write(`data: ${JSON.stringify(chunk)}\\n\\n`);
                        
                        // Add small delay for streaming effect
                        await new Promise(resolve => setTimeout(resolve, 10));
                    }
                } else {
                    // Handle single content block
                    const chunk = {
                        type: 'content',
                        data: result.content,
                        timestamp: new Date().toISOString()
                    };
                    res.write(`data: ${JSON.stringify(chunk)}\\n\\n`);
                }
                
                // Send completion event
                const completion = {
                    type: 'complete',
                    tool: toolName,
                    success: true,
                    timestamp: new Date().toISOString()
                };
                res.write(`data: ${JSON.stringify(completion)}\\n\\n`);
                res.end();
                
            } catch (error) {
                console.error(`Error streaming tool ${req.params.toolName}:`, error);
                
                // Send error event
                const errorEvent = {
                    type: 'error',
                    tool: req.params.toolName,
                    error: error.message,
                    timestamp: new Date().toISOString()
                };
                res.write(`data: ${JSON.stringify(errorEvent)}\\n\\n`);
                res.end();
            }
        });
        
        // Batch tool execution endpoint
        app.post('/tools/batch', async (req, res) => {
            try {
                const { tools } = req.body;
                
                if (!Array.isArray(tools)) {
                    return res.status(400).json({
                        error: 'Invalid request format',
                        message: 'Expected "tools" array in request body'
                    });
                }
                
                console.log(`Executing batch of ${tools.length} tools`);
                
                const results = [];
                
                for (const [index, toolRequest] of tools.entries()) {
                    try {
                        const { name, arguments: toolArgs } = toolRequest;
                        
                        const result = await server.server.request({
                            method: 'tools/call',
                            params: {
                                name,
                                arguments: toolArgs || {}
                            }
                        });
                        
                        results.push({
                            index,
                            tool: name,
                            success: true,
                            result: result.content,
                            timestamp: new Date().toISOString()
                        });
                    } catch (error) {
                        results.push({
                            index,
                            tool: toolRequest.name,
                            success: false,
                            error: error.message,
                            timestamp: new Date().toISOString()
                        });
                    }
                }
                
                res.json({
                    success: true,
                    results,
                    count: results.length,
                    timestamp: new Date().toISOString()
                });
                
            } catch (error) {
                console.error('Error executing batch tools:', error);
                res.status(500).json({
                    success: false,
                    error: 'Batch execution failed',
                    message: error.message
                });
            }
        });
        
        // OpenAPI/Swagger documentation endpoint
        app.get('/docs', (req, res) => {
            const docs = {
                openapi: '3.0.0',
                info: {
                    title: 'Plane MCP Tools API',
                    version: '1.0.0',
                    description: 'HTTP API for Plane project management tools'
                },
                servers: [
                    {
                        url: `http://localhost:${process.env.PORT || 3094}`,
                        description: 'Local development server'
                    }
                ],
                paths: {
                    '/health': {
                        get: {
                            summary: 'Health check',
                            responses: {
                                '200': {
                                    description: 'Server status',
                                    content: {
                                        'application/json': {
                                            schema: {
                                                type: 'object',
                                                properties: {
                                                    status: { type: 'string' },
                                                    transport: { type: 'string' },
                                                    uptime: { type: 'number' }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    '/tools': {
                        get: {
                            summary: 'List available tools',
                            responses: {
                                '200': {
                                    description: 'List of tools',
                                    content: {
                                        'application/json': {
                                            schema: {
                                                type: 'object',
                                                properties: {
                                                    tools: { type: 'array' },
                                                    count: { type: 'number' }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    '/tools/{toolName}': {
                        post: {
                            summary: 'Execute a tool',
                            parameters: [
                                {
                                    name: 'toolName',
                                    in: 'path',
                                    required: true,
                                    schema: { type: 'string' }
                                }
                            ],
                            requestBody: {
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                arguments: { type: 'object' }
                                            }
                                        }
                                    }
                                }
                            },
                            responses: {
                                '200': {
                                    description: 'Tool execution result'
                                }
                            }
                        }
                    },
                    '/tools/{toolName}/stream': {
                        post: {
                            summary: 'Execute a tool with streaming response',
                            parameters: [
                                {
                                    name: 'toolName',
                                    in: 'path',
                                    required: true,
                                    schema: { type: 'string' }
                                }
                            ],
                            responses: {
                                '200': {
                                    description: 'Streaming tool execution result',
                                    content: {
                                        'text/event-stream': {
                                            schema: { type: 'string' }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            };
            
            res.json(docs);
        });
        
        // 404 handler
        app.use('*', (req, res) => {
            res.status(404).json({
                error: 'Not found',
                message: `Endpoint ${req.method} ${req.originalUrl} not found`,
                availableEndpoints: [
                    'GET /health',
                    'GET /tools',
                    'POST /tools/{toolName}',
                    'POST /tools/{toolName}/stream',
                    'POST /tools/batch',
                    'GET /docs'
                ]
            });
        });
        
        // Error handler
        app.use((error, req, res, next) => {
            console.error('Unhandled error:', error);
            res.status(500).json({
                error: 'Internal server error',
                message: error.message
            });
        });
        
        const PORT = process.env.PORT || 3094;
        const httpServer = app.listen(PORT, '0.0.0.0', () => {
            console.log(`Plane HTTP server is running on port ${PORT}`);
            console.log(`Available endpoints:`);
            console.log(`  GET  /health               - Health check`);
            console.log(`  GET  /tools                - List tools`);
            console.log(`  POST /tools/{name}         - Execute tool`);
            console.log(`  POST /tools/{name}/stream  - Execute tool (streaming)`);
            console.log(`  POST /tools/batch          - Execute multiple tools`);
            console.log(`  GET  /docs                 - API documentation`);
            console.log(`Server ready for HTTP requests!`);
        });
        
        const cleanup = async () => {
            console.log('Starting HTTP server cleanup...');
            
            if (httpServer) {
                console.log('Closing HTTP server...');
                httpServer.close();
            }
            
            if (server.server) {
                console.log('Closing MCP server...');
                await server.server.close();
            }
            
            console.log('HTTP server cleanup complete');
            process.exit(0);
        };
        
        process.on('SIGINT', cleanup);
        process.on('SIGTERM', cleanup);
        process.on('uncaughtException', async (error) => {
            console.error('Uncaught exception in HTTP server:', error);
            await cleanup();
        });
        
    } catch (error) {
        console.error('Failed to start HTTP server:', error);
        process.exit(1);
    }
}