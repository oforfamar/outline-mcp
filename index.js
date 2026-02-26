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

function formatToolResult(value, isError = false) {
  const text =
    typeof value === "string" ? value : JSON.stringify(value, null, 2);
  return {
    content: [{ type: "text", text }],
    ...(isError ? { isError: true } : {}),
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
      query: z.string().min(1).describe("The search query"),
      collectionId: z.string().optional().describe("Optional collection ID to restrict the search"),
    },
  },
  async ({ query, collectionId }) => {
    try {
      if (!query || !query.trim()) {
        throw new Error("Parameter 'query' is required");
      }

      const payload = { query: query.trim() };
      if (collectionId?.trim()) {
        payload.collectionId = collectionId.trim();
      }

      const data = await callOutline("documents.search", payload);
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
      return formatToolResult(`Error: ${message}`, true);
    }
  },
);

server.registerTool(
  "get_document",
  {
    description: "Get an Outline document by id",
    inputSchema: {
      id: z.string().min(1).describe("The ID of the document to retrieve"),
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
      return formatToolResult(`Error: ${message}`, true);
    }
  },
);

server.registerTool(
  "create_document",
  {
    description: "Create and publish a new Outline document",
    inputSchema: {
      title: z.string().min(1).describe("The title of the new document"),
      text: z.string().min(1).describe("The markdown content of the document"),
      collectionId: z.string().min(1).describe("The ID of the collection to place the document in"),
      publish: z.boolean().optional().describe("Whether to publish the document (default: true)"),
    },
  },
  async ({ title, text, collectionId, publish = true }) => {
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
        publish,
      });

      return formatToolResult(`Created: ${data?.url ?? "(no url returned)"}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return formatToolResult(`Error: ${message}`, true);
    }
  },
);

server.registerTool(
  "update_document",
  {
    description: "Update an existing Outline document",
    inputSchema: {
      id: z.string().min(1).describe("The ID of the document to update"),
      title: z.string().optional().describe("The new title of the document"),
      text: z.string().optional().describe("The new markdown content of the document"),
      append: z.boolean().optional().describe("If true, appends text to the end of the document instead of replacing it"),
    },
  },
  async ({ id, title, text, append }) => {
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
        if (append) {
          payload.append = true;
        }
      }

      const data = await callOutline("documents.update", payload);
      return formatToolResult(`Updated: ${data?.url ?? "(no url returned)"}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return formatToolResult(`Error: ${message}`, true);
    }
  },
);

server.registerTool(
  "list_collections",
  {
    description: "List Outline collections. Collections are top-level workspaces.",
    inputSchema: {
      offset: z.number().optional().describe("Pagination offset"),
      limit: z.number().optional().describe("Pagination limit (default: 25)"),
    },
  },
  async ({ offset, limit }) => {
    try {
      const payload = {};
      if (offset !== undefined) payload.offset = offset;
      if (limit !== undefined) payload.limit = limit;

      const data = await callOutline("collections.list", payload);
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
      return formatToolResult(`Error: ${message}`, true);
    }
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
