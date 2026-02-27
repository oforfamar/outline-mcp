# outline-mcp

Minimal MCP server for Outline using Node.js 24+, native `fetch`, and Streamable HTTP transport.
Designed to be run directly or behind MCPO for OpenWebUI OpenAPI integration.

## Requirements

- Node.js >= 24
- `OUTLINE_URL`
- `OUTLINE_TOKEN`

## Environment Variables

- `OUTLINE_URL`: Base URL for your Outline instance (example: `https://your-outline-url`)
- `OUTLINE_TOKEN`: Outline API token
- `MCP_HOST`: HTTP bind host (default: `0.0.0.0`)
- `MCP_PORT`: HTTP bind port (default: `3000`)

## Local Run

```bash
OUTLINE_URL=https://your-outline-url \
OUTLINE_TOKEN=your_token \
MCP_PORT=3000 \
node index.js
```

Server endpoints:

- MCP: `http://localhost:3000/mcp`
- Health: `http://localhost:3000/health`

Notes:

- This server uses MCP Streamable HTTP transport (not stdio).
- MCP requests to `/mcp` must include:
  - `Content-Type: application/json`
  - `Accept: application/json, text/event-stream`

## Docker Run

```bash
docker build -t outline-mcp .
docker run --rm \
  -p 3000:3000 \
  -e OUTLINE_URL=https://your-outline-url \
  -e OUTLINE_TOKEN=your_token \
  -e MCP_PORT=3000 \
  outline-mcp
```

## Docker Compose Example

```yaml
services:
  outline-mcp:
    image: outline-mcp:latest
    build:
      context: .
    ports:
      - "3000:3000"
    environment:
      OUTLINE_URL: https://your-outline-url
      OUTLINE_TOKEN: your_token
      MCP_HOST: 0.0.0.0
      MCP_PORT: 3000
```

Run it with:

```bash
docker compose up --build
```

## Quick MCP Check with curl

Health check:

```bash
curl -sS http://localhost:3000/health
```

Initialize MCP session:

```bash
curl -sS -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc":"2.0",
    "id":"init-1",
    "method":"initialize",
    "params":{
      "protocolVersion":"2025-03-26",
      "capabilities":{},
      "clientInfo":{"name":"curl","version":"1.0.0"}
    }
  }'
```

Send initialized notification:

```bash
curl -sS -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc":"2.0",
    "method":"notifications/initialized",
    "params":{}
  }'
```

List available tools:

```bash
curl -sS -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc":"2.0",
    "id":"tools-1",
    "method":"tools/list",
    "params":{}
  }'
```

## OpenWebUI Setup

You can integrate this server with OpenWebUI in two ways:

1. Direct MCP HTTP endpoint (no MCPO)
2. MCPO sidecar that exposes an OpenAPI endpoint for OpenWebUI

### Option A: Direct MCP endpoint

Add this server in OpenWebUI as an MCP HTTP endpoint:

- URL: `http://<host-or-container-ip>:3000/mcp`
- Method/Transport: Streamable HTTP (MCP)

If OpenWebUI runs in Docker on the same host, use one of:

- `http://host.docker.internal:3000/mcp` (Docker Desktop)
- `http://<docker-host-ip>:3000/mcp` (Linux)

### Option B: MCPO sidecar (OpenAPI endpoint)

Run `outline-mcp` as-is, then run MCPO as a sidecar and point MCPO to:

- `http://outline-mcp:3000/mcp` (inside Docker network), or
- `http://host.docker.internal:3000/mcp` / host IP (from another container)

Then configure OpenWebUI to use the MCPO OpenAPI URL.

Important: MCPO CLIs/images differ by version. Use your MCPO build's documented flags/options for:

- MCP upstream URL
- OpenAPI bind host/port
- Any auth or CORS settings required by your OpenWebUI deployment

If your MCPO build does not support MCP HTTP upstream, this project must be converted to a stdio MCP entrypoint before MCPO can wrap it.

## Tools

- `search_documents`
- `get_document`
- `create_document`
- `update_document`
- `delete_document`
- `list_collections`

## Security

Never hardcode or expose `OUTLINE_TOKEN` in source code, logs, or shared configuration files.
