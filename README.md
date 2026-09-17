# Agentic UI demos

Runnable demos of the protocols agents use to put real UI in front of a user.

```bash
npm install
npm start          # http://localhost:8787
```

Node 24+ (TypeScript runs directly — no build step).

---

## MCP Apps vs A2UI

One flight-booking tool, rendered two ways, side by side. Each protocol owns a
directory, so it is always clear which file belongs to which side:

```
shared/      flights.ts        the ONLY shared code — the domain both sides render
             README.md

mcp-apps/    server.ts         MCP server: ui:// resource + tools          (Node)
             widget.html       the UI, shipped over the protocol           (iframe)
             host.js           host: sandbox + postMessage bridge          (browser)
             README.md         ← how this side works

a2ui/        agent.ts          emits surfaceUpdate + dataModelUpdate       (Node)
             client.js         renders it from a fixed widget CATALOG      (browser)
             README.md         ← how this side works

web/         index.html        the split-screen page + all A2UI styling
server.ts                      routing only: /mcp, /a2ui/*, static allowlist
```

Nothing is shared between `mcp-apps/` and `a2ui/`. They meet only at `shared/flights.ts`
and at the two panes of `web/index.html`.

### The difference in one line each

**MCP Apps** — the server publishes HTML as a `ui://` resource; the host reads the template
off the tool's `_meta`, drops it in a sandboxed iframe, and relays `postMessage` JSON-RPC
back to the same MCP server. Unbounded UI, untrusted code, needs a webview.

**A2UI** — the agent emits a component tree plus a data model; the client renders it from a
fixed catalog of its own widgets. Bounded UI, no code executed, renders natively anywhere.

See `mcp-apps/README.md` and `a2ui/README.md` for each side's message flow.

### Things to try

- **"Switch A2UI design system"** — the right pane restyles completely while the JSON the
  agent sent stays byte-identical. The left pane can't follow; the server picked its own CSS.
- **The price bars on the left** — a gradient bar sized by fare relative to the cheapest.
  There is no `PriceBar` in the A2UI catalog, and the agent cannot add one.
- **Break the catalog** — add `{ Map: {...} }` to a `surfaceUpdate` in `a2ui/agent.ts`. The
  client throws instead of rendering something unknown.
- **Try to escape the sandbox** — add `fetch('/mcp')` to `mcp-apps/widget.html`. It fails;
  `postMessage` to the host is the only channel out.
- **Try to fetch the widget** — `curl localhost:8787/mcp-apps/widget.html` returns 404. It is
  absent from `STATIC_ROUTES`, so it only ever travels over `resources/read`.

### Caveat

Both specs are young (late 2025). The shapes here are right, but exact field names —
`_meta["mcp/ui"]` in particular — have moved between revisions and differ from the
OpenAI Apps SDK (`openai/outputTemplate`). Pin the spec version you target.
