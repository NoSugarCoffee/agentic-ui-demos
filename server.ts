import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpServer } from './mcp-server.ts';
import { handleAction, searchSurface, type UserAction } from './a2ui-agent.ts';

const PORT = 8787;

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8'
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
  const file = pathname === '/' ? '/index.html' : pathname;
  try {
    const body = await readFile(new URL(`./public${file}`, import.meta.url));
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404).end('not found');
  }
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
