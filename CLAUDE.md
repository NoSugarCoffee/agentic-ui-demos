# CLAUDE.md

A side-by-side demo of two agent-UI renderer contracts: **MCP Apps** (server ships
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

| File | Role |
| --- | --- |
| `flights.ts` | Shared domain. Both renderers call these same pure functions. |
| `mcp-server.ts` | MCP server: the `ui://` resource plus `search_flights` / `book_flight`. |
| `widget/flight-picker.html` | The MCP Apps UI. Deliberately outside `public/`. |
| `a2ui-agent.ts` | The A2UI agent: builds `surfaceUpdate` + `dataModelUpdate`. |
| `public/mcp-host.js` | Minimal MCP Apps host: template lookup, sandbox, postMessage bridge. |
| `public/a2ui-client.js` | Minimal A2UI renderer: the component `CATALOG`. |
| `server.ts` | `node:http` routing for `/mcp`, `/a2ui/*`, and static files. |

## Invariants

These are the point of the demo, not incidental choices:

- `widget/` stays outside `public/`. The widget must be reachable only through
  `resources/read`, proving the UI travels on the protocol.
- The MCP iframe keeps `sandbox="allow-scripts"` **without** `allow-same-origin`.
  This makes it cross-origin to its own host, so `postMessage` is its only channel.
  It also means the host page cannot read `iframe.contentDocument` — verify the
  left pane through `#mcp-log`, not by reaching into the frame.
- `a2ui-agent.ts` never emits HTML, CSS, or anything executable. A new visual
  affordance on that side requires a new entry in the client's `CATALOG`.
- Unknown A2UI components throw rather than degrade. Keep it that way.
- The two panes must stay visually distinguishable — the left pane's price bars
  exist specifically to show something the fixed catalog cannot express.

## Spec drift

`_meta["mcp/ui"]` in `mcp-server.ts` is the field most likely to be stale; the key
name moved across SEP-1865 revisions and differs from the OpenAI Apps SDK
(`openai/outputTemplate`). If a real host ignores the template, check this first.
