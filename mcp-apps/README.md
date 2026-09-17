# MCP Apps side

**The server ships HTML. The host sandboxes it.**

| File | Runs where | Role |
| --- | --- | --- |
| `server.ts` | Node | MCP server. Publishes the `ui://` resource and the two tools. |
| `widget.html` | Sandboxed iframe | The UI itself. Never served over HTTP — only via `resources/read`. |
| `host.js` | Browser (host page) | Finds the template, sandboxes it, bridges `postMessage` ↔ MCP. |

## The flow

```
host.js  ──tools/list──────────────▶  server.ts
         ◀─ _meta["mcp/ui"].resourceUri = ui://widget/flight-picker.html

host.js  ──tools/call search_flights▶
         ◀─ structuredContent { flights }

host.js  ──resources/read ui://...──▶
         ◀─ text/html  (widget.html, 3.6 KB)

host.js  ── <iframe sandbox="allow-scripts" srcdoc=...>
         ◀── postMessage  notifications/ui/ready
         ──▶ postMessage  ui/render { flights }
         ◀── postMessage  notifications/ui/sizeChanged { height }
         ◀── postMessage  tools/call book_flight { id }   ──▶ server.ts
```

## The `ui://` URI is not a file path

`ui://widget/flight-picker.html` is an opaque identifier the server chose. It does not have
to resemble where `widget.html` sits on disk, and nothing resolves it as a path — the server
maps it to a file itself in `server.ts`. Renaming the file does not change the URI, and
changing the URI does not move the file.

## Why it's built this way

- `widget.html` lives here, next to the server that publishes it, and is absent from
  `STATIC_ROUTES` in the root `server.ts`. If you can fetch it over HTTP, the demo is broken.
- The iframe gets `allow-scripts` **without** `allow-same-origin`, making it cross-origin to
  its own host. `postMessage` is genuinely its only channel — `fetch('/mcp')` from inside fails.
  Side effect: the host page cannot read `iframe.contentDocument`, so verify this pane
  through `#mcp-log`, not by reaching into the frame.
- The price bars in `widget.html` are the point of this side: arbitrary CSS the server chose.
  Nothing in the A2UI catalog can express them.
