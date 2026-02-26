# outline-mcp

Minimal MCP server for Outline using Node.js 24+, native `fetch`, and Streamable HTTP transport.

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

Add this server in OpenWebUI as an MCP HTTP endpoint:

- URL: `http://<host-or-container-ip>:3000/mcp`
- Method/Transport: Streamable HTTP (MCP)

If OpenWebUI runs in Docker on the same host, use one of:

- `http://host.docker.internal:3000/mcp` (Docker Desktop)
- `http://<docker-host-ip>:3000/mcp` (Linux)

## Tools

- `search_documents`
- `get_document`
- `create_document`
- `update_document`
- `list_collections`

## Security

Never hardcode or expose `OUTLINE_TOKEN` in source code, logs, or shared configuration files.
