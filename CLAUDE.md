# CLAUDE.md

A collection of runnable agent-UI protocol demos. Currently one: a three-way
comparison of renderer contracts — **MCP Apps** (server ships sandboxed HTML),
**A2UI** (agent ships a declarative component tree), and **AG-UI** (agent ships
events and state patches, and never describes UI at all). All three drive the
same flight-booking domain so the contract is the only variable.

MCP Apps and A2UI are alternatives to each other. AG-UI is on a different axis:
it answers "what happened", not "what should this look like". Keep that framing
in the docs — collapsing all three into one spectrum is the easy wrong read.

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
| `shared/flights.ts` | Node | The only shared code. All three sides call these pure functions. |
| `mcp-apps/server.ts` | Node | MCP server: the `ui://` resource plus the two tools. |
| `mcp-apps/widget.html` | Sandboxed iframe | The MCP Apps UI. Never served over HTTP. |
| `mcp-apps/host.js` | Browser | Host: template lookup, sandbox, postMessage bridge. |
| `a2ui/agent.ts` | Node | Builds `surfaceUpdate` + `dataModelUpdate`. Emits no markup. |
| `a2ui/client.js` | Browser | The component `CATALOG` renderer. |
| `ag-ui/agent.ts` | Node | Streams typed events + JSON Patch state. No UI vocabulary. |
| `ag-ui/client.js` | Browser | Folds events into state; owns every pixel it draws. |
| `web/index.html` | Browser | Three-pane page, A2UI skin CSS, and AG-UI pane CSS. |
| `server.ts` | Node | Routing only: `/mcp`, `/a2ui/*`, `/ag-ui/run`, and `STATIC_ROUTES`. |

`mcp-apps/`, `a2ui/` and `ag-ui/` must not import from each other. They meet only at
`shared/flights.ts` and at the three panes of `web/index.html`. Each has its own README
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
- `ag-ui/agent.ts` contains no HTML, no component names, no styling and no layout hints.
  If presentation vocabulary appears there, the demo has lost its point.
- AG-UI's streaming must stay real — one SSE frame per `TEXT_MESSAGE_CONTENT`, so the text
  visibly types out. Do not batch the deltas or fake it with a client-side timer.
- The booking run must use `STATE_DELTA`, not another `STATE_SNAPSHOT`. Showing that the
  client patches state it already holds is the reason that path exists.
- The three panes must stay visually distinguishable — the price bars (MCP Apps), the skin
  switch (A2UI) and the streaming text (AG-UI) each exist to show something the other two
  contracts cannot express. Do not "harmonise" them.

## Spec drift

`_meta["mcp/ui"]` in `mcp-apps/server.ts` is the field most likely to be stale; the key
name moved across SEP-1865 revisions and differs from the OpenAI Apps SDK
(`openai/outputTemplate`). If a real host ignores the template, check this first.
