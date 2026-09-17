# MCP Apps vs A2UI

One flight-booking tool, rendered two ways, side by side.

```bash
npm install
npm start          # http://localhost:8787
```

Requires Node 24+ (the server is TypeScript run directly, no build step).

## What each pane does

**MCP Apps** (`mcp-server.ts`, `widget/flight-picker.html`, `public/mcp-host.js`)

1. `tools/list` — the host reads `_meta["mcp/ui"].resourceUri` off `search_flights`
2. `tools/call search_flights` — returns `structuredContent`
3. `resources/read ui://widget/flight-picker.html` — the UI arrives *over the protocol*
4. the host drops that HTML into `<iframe sandbox="allow-scripts">`
5. the iframe talks back over `postMessage` JSON-RPC: `notifications/ui/ready`,
   `notifications/ui/sizeChanged`, and `tools/call book_flight`

The widget is never served over HTTP — it lives in `widget/`, outside `public/`.

**A2UI** (`a2ui-agent.ts`, `public/a2ui-client.js`)

1. the agent returns `surfaceUpdate` (component tree) + `dataModelUpdate` (data) + `beginRendering`
2. `CATALOG` in the client maps each component name to a real DOM widget
3. a `Button`'s action posts `{name, context}` back; the agent replies with a new surface

No markup crosses the wire, so nothing the agent sends can execute.

## Things to try

- **"Switch A2UI design system"** — the right pane restyles completely; the JSON the agent
  sent is byte-identical. The left pane can't follow, because the server chose its own CSS.
- **The price bars in the left pane** — a gradient bar sized by price relative to the cheapest
  flight. There is no `PriceBar` in the A2UI catalog, and the agent can't add one.
- **Break the catalog** — add `{ Map: {...} }` to a `surfaceUpdate` in `a2ui-agent.ts`. The client
  throws `Component "Map" is not in this client's catalog` instead of rendering something unknown.
- **Try to reach out of the sandbox** — add `fetch('/mcp')` to the widget. It fails; the iframe's
  only channel is `postMessage` to the host.

## Caveat

Both specs are young (late 2025). The shapes here are right, but exact field names —
`_meta["mcp/ui"]` in particular — have moved between revisions and differ from the
OpenAI Apps SDK (`openai/outputTemplate`). Pin the spec version you target.
