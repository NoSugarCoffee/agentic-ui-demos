# CLAUDE.md

A collection of runnable agent-UI protocol demos. Currently one: a side-by-side
comparison of two renderer contracts: **MCP Apps** (server ships
sandboxed HTML) and **A2UI** (agent ships a declarative JSON component tree).
Both drive the same flight-booking domain so the contrast is the only variable.

## Commands

```bash
npm install
npm start        # http://localhost:8787
```

Node 24+ required. TypeScript runs directly via Node's native type stripping —
there is no build step, no tsconfig, and no bundler. Do not add one.

## Layout

Each protocol owns a directory. Keep it that way — the whole point of the repo is that a
reader can tell at a glance which file implements which side.

| Path | Runs where | Role |
| --- | --- | --- |
| `shared/flights.ts` | Node | The only shared code. Both sides call these pure functions. |
| `mcp-apps/server.ts` | Node | MCP server: the `ui://` resource plus the two tools. |
| `mcp-apps/widget.html` | Sandboxed iframe | The MCP Apps UI. Never served over HTTP. |
| `mcp-apps/host.js` | Browser | Host: template lookup, sandbox, postMessage bridge. |
| `a2ui/agent.ts` | Node | Builds `surfaceUpdate` + `dataModelUpdate`. Emits no markup. |
| `a2ui/client.js` | Browser | The component `CATALOG` renderer. |
| `web/index.html` | Browser | Split-screen page and all A2UI skin CSS. |
| `server.ts` | Node | Routing only: `/mcp`, `/a2ui/*`, and `STATIC_ROUTES`. |

`mcp-apps/` and `a2ui/` must not import from each other. They meet only at
`shared/flights.ts` and at the two panes of `web/index.html`. Each has its own README
explaining that side's message flow; update it when you change the flow.

## Invariants

These are the point of the demo, not incidental choices:

- `mcp-apps/widget.html` stays out of `STATIC_ROUTES` in `server.ts`. It must be reachable only through
  `resources/read`, proving the UI travels on the protocol.
- The MCP iframe keeps `sandbox="allow-scripts"` **without** `allow-same-origin`.
  This makes it cross-origin to its own host, so `postMessage` is its only channel.
  It also means the host page cannot read `iframe.contentDocument` — verify the
  left pane through `#mcp-log`, not by reaching into the frame.
- `a2ui/agent.ts` never emits HTML, CSS, or anything executable. A new visual
  affordance on that side requires a new entry in the client's `CATALOG`.
- Unknown A2UI components throw rather than degrade. Keep it that way.
- The two panes must stay visually distinguishable — the left pane's price bars
  exist specifically to show something the fixed catalog cannot express.

## Spec drift

`_meta["mcp/ui"]` in `mcp-apps/server.ts` is the field most likely to be stale; the key
name moved across SEP-1865 revisions and differs from the OpenAI Apps SDK
(`openai/outputTemplate`). If a real host ignores the template, check this first.
