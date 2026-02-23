# outline-mcp

Minimal MCP server for Outline using Node.js 24+, native `fetch`, and stdio transport.

## Requirements

- Node.js >= 24
- `OUTLINE_URL`
- `OUTLINE_TOKEN`

## Environment Variables

- `OUTLINE_URL`: Base URL for your Outline instance (example: `https://your-outline-url`)
- `OUTLINE_TOKEN`: Outline API token

## Local Run

```bash
OUTLINE_URL=https://your-outline-url \
OUTLINE_TOKEN=your_token \
node index.js
```

## Docker Run

```bash
docker build -t outline-mcp .
docker run --rm \
  -e OUTLINE_URL=https://your-outline-url \
  -e OUTLINE_TOKEN=your_token \
  outline-mcp
```

## Docker Compose Example

```yaml
services:
  outline-mcp:
    image: outline-mcp:latest
    build:
      context: .
    environment:
      OUTLINE_URL: https://your-outline-url
      OUTLINE_TOKEN: your_token
    stdin_open: true
    tty: true
```

Run it with:

```bash
docker compose up --build
```

## Tools

- `search_documents`
- `get_document`
- `create_document`
- `update_document`
- `list_collections`

## Security

Never hardcode or expose `OUTLINE_TOKEN` in source code, logs, or shared configuration files.
