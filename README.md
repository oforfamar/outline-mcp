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
