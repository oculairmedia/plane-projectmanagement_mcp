# Plane MCP HTTP Transport

The Plane MCP server now supports HTTP streaming transport in addition to the existing stdio and SSE transports.

## Transport Options

### 1. stdio (default)
```bash
node src/index.js
```
- Standard MCP stdio transport for direct integration with MCP clients

### 2. SSE (Server-Sent Events)
```bash
node src/index.js --sse
```
- Real-time streaming via SSE for web integrations

### 3. HTTP (NEW)
```bash
node src/index.js --http
```
- RESTful HTTP API with streaming support for direct HTTP clients

## HTTP Transport Features

### Endpoints

- **GET /health** - Health check and server status
- **GET /tools** - List all available Plane tools
- **POST /tools/{toolName}** - Execute a tool (JSON response)
- **POST /tools/{toolName}/stream** - Execute a tool with streaming response (SSE)
- **POST /tools/batch** - Execute multiple tools in batch
- **GET /docs** - OpenAPI/Swagger documentation

### Example Usage

#### Health Check
```bash
curl http://localhost:3094/health
```

#### List Tools
```bash
curl http://localhost:3094/tools
```

#### Execute Tool
```bash
curl -X POST http://localhost:3094/tools/create_plane_project_v2 \
  -H "Content-Type: application/json" \
  -d '{
    "arguments": {
      "name": "Test Project",
      "identifier": "TEST",
      "description": "A test project"
    }
  }'
```

#### Streaming Tool Execution
```bash
curl -X POST http://localhost:3094/tools/create_plane_project_v2/stream \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{
    "arguments": {
      "name": "Test Project",
      "identifier": "TEST" 
    }
  }'
```

#### Batch Tool Execution
```bash
curl -X POST http://localhost:3094/tools/batch \
  -H "Content-Type: application/json" \
  -d '{
    "tools": [
      {
        "name": "list_plane_projects",
        "arguments": {}
      },
      {
        "name": "create_plane_project_v2", 
        "arguments": {
          "name": "Batch Project",
          "identifier": "BATCH"
        }
      }
    ]
  }'
```

## Docker Configuration

### Current Setup (SSE Transport)
```yaml
services:
  planemcp:
    image: oculair/planeprojectmanagermcp:latest
    ports:
      - 3094:3094
    command: ["node", "src/index.js", "--sse"]
```

### HTTP Transport Setup
```yaml
services:
  planemcp:
    image: oculair/planeprojectmanagermcp:latest
    ports:
      - 3094:3094
    command: ["node", "src/index.js", "--http"]
```

### Dual Setup (Both SSE and HTTP)
```yaml
services:
  planemcp-sse:
    image: oculair/planeprojectmanagermcp:latest
    ports:
      - 3094:3094
    command: ["node", "src/index.js", "--sse"]
    
  planemcp-http:
    image: oculair/planeprojectmanagermcp:latest  
    ports:
      - 3095:3094
    command: ["node", "src/index.js", "--http"]
```

## Integration Benefits

### For Web Applications
- Direct HTTP API calls without MCP client setup
- Standard REST endpoints for easy integration
- CORS support for browser applications

### For Development & Testing
- Simple curl commands for testing
- OpenAPI documentation at `/docs`
- Health monitoring via `/health`

### For Production
- Load balancing friendly (stateless HTTP)
- Standard HTTP monitoring and logging
- Easy integration with API gateways

## Response Formats

### Standard Tool Response
```json
{
  "success": true,
  "result": [
    {
      "type": "text", 
      "text": "Tool execution result"
    }
  ],
  "tool": "tool_name",
  "timestamp": "2025-06-21T18:45:00Z"
}
```

### Streaming Response (SSE)
```
data: {"type": "start", "tool": "tool_name", "timestamp": "..."}

data: {"type": "content", "data": {...}, "timestamp": "..."}

data: {"type": "complete", "tool": "tool_name", "success": true, "timestamp": "..."}
```

### Error Response
```json
{
  "success": false,
  "error": "Error description",
  "message": "Detailed error message",
  "tool": "tool_name"
}
```

## Security Features

- CORS configuration for cross-origin requests
- Request validation and error handling
- Proper HTTP status codes
- Input sanitization

This HTTP transport makes the Plane MCP tools accessible via standard HTTP APIs while maintaining compatibility with the existing MCP protocol via stdio and SSE transports.