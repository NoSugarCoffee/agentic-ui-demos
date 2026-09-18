# AG-UI side

**The agent ships events and state. It never mentions UI at all.**

| File | Runs where | Role |
| --- | --- | --- |
| `agent.ts` | Node | Emits a typed event stream over SSE. Knows nothing about rendering. |
| `client.js` | Browser | Folds events into state, then draws whatever it likes. |

This is the one that differs on a different axis from the other two. MCP Apps and A2UI both
answer *"what should the user see?"* — one in HTML, one in a component tree. AG-UI answers
*"what just happened?"* and leaves the drawing entirely to the frontend.

## The flow

```
client.js ──POST /ag-ui/run { kind: "search", maxPriceUsd }──▶ agent.ts
          ◀─ RUN_STARTED          { threadId, runId }
          ◀─ TEXT_MESSAGE_START   { messageId, role }
          ◀─ TEXT_MESSAGE_CONTENT { delta: "Looking " }     ─┐ one event
          ◀─ TEXT_MESSAGE_CONTENT { delta: "for " }          ├ per token,
          ◀─ TEXT_MESSAGE_CONTENT { delta: "flights " }      ─┘ painted live
          ◀─ TEXT_MESSAGE_END     { messageId }
          ◀─ TOOL_CALL_START      { toolCallId, toolCallName: "search_flights" }
          ◀─ TOOL_CALL_ARGS       { delta: "{\"maxPriceUsd\":420}" }
          ◀─ TOOL_CALL_END        { toolCallId }
          ◀─ TOOL_CALL_RESULT     { content: "{\"count\":3}" }
          ◀─ STATE_SNAPSHOT       { snapshot: { headline, flights, booking } }
          ◀─ RUN_FINISHED         { threadId, runId }
```

Booking sends a second run on the same `threadId`, and this time the agent patches rather
than replaces:

```
          ◀─ STATE_DELTA [ { "op": "add",     "path": "/booking",  "value": {...} },
                           { "op": "replace", "path": "/headline", "value": "Booked Delta DL204" } ]
```

That is RFC 6902 JSON Patch. The frontend already holds the flight list; sending it again
would be waste, so only the diff crosses the wire.

## Snapshot vs. delta

`STATE_SNAPSHOT` replaces the client's state wholesale — used for the first paint, or to
resynchronise after a reconnect. `STATE_DELTA` patches what the client already has. The
client applies both into the same `state` object, and `paint()` is a pure function of it.

## Why it's built this way

- `agent.ts` contains no HTML, no component names, no styling, and no layout hints. Grep it:
  the closest it comes to presentation is the word `headline`, which is data.
- Every pixel in this pane is decided in `client.js` and `web/index.html`. Swapping this
  frontend for a native iOS app would need no change on the agent side at all.
- The streaming is real, not simulated at the client. Each `TEXT_MESSAGE_CONTENT` is a
  separate SSE frame, which is why the text types itself out.
- SSE is a choice, not a requirement — AG-UI is transport-agnostic (SSE, WebSocket, webhooks).
  `handleAgUiRun` in the root `server.ts` is the only place that assumes SSE.

## What it costs you

The agent has no way to ask for a specific widget. If the flight list should become a
calendar view, that is a frontend change and a redeploy — the agent cannot decide it at
runtime the way MCP Apps can with new HTML, or A2UI can by naming a different component.
