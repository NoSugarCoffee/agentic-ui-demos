# Agentic UI demos

Runnable demos of the protocols agents use to put real UI in front of a user.

```bash
npm install
npm start          # http://localhost:8787
```

Node 24+ (TypeScript runs directly — no build step).

---

## MCP Apps vs A2UI vs AG-UI

One flight-booking tool, rendered three ways, side by side. Each protocol owns a
directory, so it is always clear which file belongs to which side:

```
shared/      flights.ts        the ONLY shared code — the domain all three render
             README.md

mcp-apps/    server.ts         MCP server: ui:// resource + tools          (Node)
             widget.html       the UI, shipped over the protocol           (iframe)
             host.js           host: sandbox + postMessage bridge          (browser)
             README.md         ← how this side works

a2ui/        agent.ts          emits surfaceUpdate + dataModelUpdate       (Node)
             client.js         renders it from a fixed widget CATALOG      (browser)
             README.md         ← how this side works

ag-ui/       agent.ts          streams typed events + JSON Patch state     (Node)
             client.js         folds events into state, draws it itself    (browser)
             README.md         ← how this side works

web/         index.html        the three-pane page + A2UI and AG-UI styling
server.ts                      routing only: /mcp, /a2ui/*, /ag-ui/run, static allowlist
```

The three protocol directories import nothing from each other. They meet only at
`shared/flights.ts` and at the three panes of `web/index.html`.

### What crosses the wire

| | MCP Apps | A2UI | AG-UI |
| --- | --- | --- | --- |
| The agent sends | HTML/JS/CSS | a component tree | events + state patches |
| Answers the question | what it should look like | what it is made of | what just happened |
| Who decides the pixels | the server | the client's catalog | the frontend, entirely |
| Rendering | sandboxed iframe | native widgets | native, whatever you wrote |
| Vocabulary | unbounded | fixed catalog | not applicable — no UI is described |
| Shape | request → response | request → response | a stream of events |
| Streaming / partial UI | no | no | yes, token by token |
| Custom visualisation | easy | only if the catalog has it | only if you built it |
| Untrusted code executed | yes — sandbox is load-bearing | none | none |
| Agent can change the UI at runtime | yes, new HTML | yes, name another component | **no** — needs a frontend change |

The first two are alternatives to each other: both describe UI, and they trade flexibility
against safety and native look. AG-UI sits on a different axis — it never describes UI, so
it composes with a hand-built frontend instead of replacing it, and it is the only one of
the three that handles a long-running agent whose answer arrives in pieces.

### Things to try

- **Watch the AG-UI pane's text type itself out.** Each word is a separate
  `TEXT_MESSAGE_CONTENT` frame on the SSE stream. Neither other pane can show partial work.
- **Book a flight in the AG-UI pane** and read its log: the agent sends
  `STATE_DELTA add /booking, replace /headline` — a JSON Patch, not a new screen. The client
  already had the flight list and never receives it twice.
- **"Switch A2UI design system"** — the middle pane restyles completely while the JSON the
  agent sent stays byte-identical. The left pane can't follow; the server picked its own CSS.
- **The price bars on the left** — a gradient bar sized by fare relative to the cheapest.
  There is no `PriceBar` in the A2UI catalog, and the agent cannot add one.
- **Break the catalog** — add `{ Map: {...} }` to a `surfaceUpdate` in `a2ui/agent.ts`. The
  client throws instead of rendering something unknown.
- **Try to escape the sandbox** — add `fetch('/mcp')` to `mcp-apps/widget.html`. It fails;
  `postMessage` to the host is the only channel out.
- **Try to fetch the widget** — `curl localhost:8787/mcp-apps/widget.html` returns 404. It is
  absent from `STATIC_ROUTES`, so it only ever travels over `resources/read`.
- **Read `ag-ui/agent.ts` looking for presentation.** There is none — no tags, no component
  names, no styling, no layout. The closest it comes is a field called `headline`, which is
  data. (Grep for `<` and you will only find TypeScript generics.)

### Caveat

All three specs are young (2025). The shapes here are right, but exact field names —
`_meta["mcp/ui"]` in particular — have moved between revisions and differ from the
OpenAI Apps SDK (`openai/outputTemplate`). Pin the spec version you target.
