import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpServer } from './mcp-apps/server.ts';
import { handleAction, searchSurface, type UserAction } from './a2ui/agent.ts';

const PORT = 8787;

// An allowlist, not a served directory: mcp-apps/widget.html is deliberately absent,
// so the MCP Apps UI is reachable only through resources/read.
const STATIC_ROUTES: Record<string, { readonly file: string; readonly type: string }> = {
  '/': { file: 'web/index.html', type: 'text/html; charset=utf-8' },
  '/mcp-apps/host.js': { file: 'mcp-apps/host.js', type: 'text/javascript; charset=utf-8' },
  '/a2ui/client.js': { file: 'a2ui/client.js', type: 'text/javascript; charset=utf-8' }
};

const readBody = async (req: IncomingMessage): Promise<unknown> => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return chunks.length === 0 ? undefined : JSON.parse(Buffer.concat(chunks).toString('utf8'));
};

const sendJson = (res: ServerResponse, status: number, body: unknown): void => {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
};

// Stateless mode: one server + transport per request keeps the demo free of session bookkeeping.
const handleMcp = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true
  });
  res.on('close', () => void transport.close());
  await createMcpServer().connect(transport);
  await transport.handleRequest(req, res, await readBody(req));
};

const serveStatic = async (pathname: string, res: ServerResponse): Promise<void> => {
  const route = STATIC_ROUTES[pathname];
  if (route === undefined) {
    res.writeHead(404).end(`No route for ${pathname}`);
    return;
  }
  res.writeHead(200, { 'content-type': route.type });
  res.end(await readFile(new URL(`./${route.file}`, import.meta.url)));
};

createServer((req, res) => {
  const { pathname } = new URL(req.url ?? '/', `http://localhost:${PORT}`);
  const route = async (): Promise<void> => {
    if (pathname === '/mcp') return handleMcp(req, res);
    if (pathname === '/a2ui/search') {
      const body = (await readBody(req)) as { maxPriceUsd: number };
      return sendJson(res, 200, searchSurface(body.maxPriceUsd));
    }
    if (pathname === '/a2ui/action') {
      return sendJson(res, 200, handleAction((await readBody(req)) as UserAction));
    }
    return serveStatic(pathname, res);
  };
  route().catch((error: unknown) => {
    sendJson(res, 500, { error: error instanceof Error ? error.message : String(error) });
  });
}).listen(PORT, () => console.log(`http://localhost:${PORT}`));
