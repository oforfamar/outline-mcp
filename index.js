import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const outlineUrl = process.env.OUTLINE_URL?.trim();
const outlineToken = process.env.OUTLINE_TOKEN?.trim();

if (!outlineUrl || !outlineToken) {
  process.stderr.write(
    "Missing required environment variables: OUTLINE_URL and OUTLINE_TOKEN\n",
  );
  process.exit(1);
}

const OUTLINE_URL = outlineUrl.replace(/\/$/, "");
const OUTLINE_TOKEN = outlineToken;

function formatToolResult(value) {
  const text =
    typeof value === "string" ? value : JSON.stringify(value, null, 2);
  return {
    content: [{ type: "text", text }],
  };
}

async function callOutline(endpoint, payload = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(`${OUTLINE_URL}/api/${endpoint}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OUTLINE_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    let responseBody = null;
    try {
      responseBody = await response.json();
    } catch {
      responseBody = null;
    }

    if (!response.ok) {
      const safeMessage =
        responseBody?.error ||
        responseBody?.message ||
        responseBody?.data?.error ||
        `Outline API request failed with status ${response.status}`;
      throw new Error(String(safeMessage));
    }

    if (!responseBody || typeof responseBody !== "object") {
      throw new Error("Outline API returned an invalid response");
    }

    return responseBody.data;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Outline API request timed out after 10 seconds");
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new Error("Unknown error while calling Outline API");
  } finally {
    clearTimeout(timeout);
  }
}

const server = new McpServer({
  name: "outline-mcp",
  version: "1.0.0",
});

server.registerTool(
  "search_documents",
  {
    description: "Search Outline documents by query",
    inputSchema: {
      query: z.string().min(1),
    },
  },
  async ({ query }) => {
    try {
      if (!query || !query.trim()) {
        throw new Error("Parameter 'query' is required");
      }

      const data = await callOutline("documents.search", {
        query: query.trim(),
      });
      const documents = Array.isArray(data)
        ? data
        : Array.isArray(data?.documents)
          ? data.documents
          : [];

      const result = documents.map((item) => ({
        id: item?.id ?? null,
        title: item?.title ?? null,
        url: item?.url ?? null,
      }));

      return formatToolResult(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return formatToolResult(`Error: ${message}`);
    }
  },
);

server.registerTool(
  "get_document",
  {
    description: "Get an Outline document by id",
    inputSchema: {
      id: z.string().min(1),
    },
  },
  async ({ id }) => {
    try {
      if (!id || !id.trim()) {
        throw new Error("Parameter 'id' is required");
      }

      const data = await callOutline("documents.info", { id: id.trim() });
      const result = {
        id: data?.id ?? null,
        title: data?.title ?? null,
        text: data?.text ?? null,
        url: data?.url ?? null,
      };

      return formatToolResult(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return formatToolResult(`Error: ${message}`);
    }
  },
);

server.registerTool(
  "create_document",
  {
    description: "Create and publish a new Outline document",
    inputSchema: {
      title: z.string().min(1),
      text: z.string().min(1),
      collectionId: z.string().min(1),
    },
  },
  async ({ title, text, collectionId }) => {
    try {
      if (!title?.trim()) {
        throw new Error("Parameter 'title' is required");
      }

      if (!text?.trim()) {
        throw new Error("Parameter 'text' is required");
      }

      if (!collectionId?.trim()) {
        throw new Error("Parameter 'collectionId' is required");
      }

      const data = await callOutline("documents.create", {
        title: title.trim(),
        text,
        collectionId: collectionId.trim(),
        publish: true,
      });

      return formatToolResult(`Created: ${data?.url ?? "(no url returned)"}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return formatToolResult(`Error: ${message}`);
    }
  },
);

server.registerTool(
  "update_document",
  {
    description: "Update an existing Outline document",
    inputSchema: {
      id: z.string().min(1),
      title: z.string().optional(),
      text: z.string().optional(),
    },
  },
  async ({ id, title, text }) => {
    try {
      if (!id?.trim()) {
        throw new Error("Parameter 'id' is required");
      }

      const hasTitle = typeof title === "string" && title.trim().length > 0;
      const hasText = typeof text === "string" && text.length > 0;

      if (!hasTitle && !hasText) {
        throw new Error("At least one of 'title' or 'text' must be provided");
      }

      const payload = { id: id.trim() };

      if (hasTitle) {
        payload.title = title.trim();
      }

      if (hasText) {
        payload.text = text;
      }

      const data = await callOutline("documents.update", payload);
      return formatToolResult(`Updated: ${data?.url ?? "(no url returned)"}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return formatToolResult(`Error: ${message}`);
    }
  },
);

server.registerTool(
  "list_collections",
  {
    description: "List Outline collections",
  },
  async () => {
    try {
      const data = await callOutline("collections.list", {});
      const collections = Array.isArray(data)
        ? data
        : Array.isArray(data?.collections)
          ? data.collections
          : [];

      const result = collections.map((item) => ({
        id: item?.id ?? null,
        name: item?.name ?? null,
        url: item?.url ?? null,
      }));

      return formatToolResult(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return formatToolResult(`Error: ${message}`);
    }
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
