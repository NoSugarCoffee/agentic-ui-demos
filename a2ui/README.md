# A2UI side

**The agent ships JSON. The client renders it with its own widgets.**

| File | Runs where | Role |
| --- | --- | --- |
| `agent.ts` | Node | Builds `surfaceUpdate` + `dataModelUpdate`. Emits no markup, ever. |
| `client.js` | Browser | `CATALOG` maps component names to this app's real DOM widgets. |

## The flow

```
client.js ──POST /a2ui/search { maxPriceUsd }──▶ agent.ts
          ◀─ surfaceUpdate  [Column, Heading, List, Button]
             dataModelUpdate { /headline, /flights }
             beginRendering  { root: "root" }

client.js builds DOM from CATALOG — nothing from the agent executes

client.js ──POST /a2ui/action { name, context }──▶ agent.ts
          ◀─ surfaceUpdate  [Card, Column, Heading, Text]
             dataModelUpdate { /confirmed, /reference }
```

## Structure vs. data

The split is deliberate. `surfaceUpdate` is the shape and is reusable; `dataModelUpdate` is
the content. A `List` names an `itemsPath` and a template component id, so one `Button`
definition renders every row:

```json
{ "id": "flightRow", "component": { "Button": {
    "label":  { "path": "item/label" },
    "action": { "name": "book_flight", "context": [{ "key": "id", "path": "item/id" }] } } } }
```

`item/…` resolves against the current list row, `/…` against the top-level data model.

## Why it's built this way

- `CATALOG` in `client.js` is the entire security boundary. The agent can only name
  components that already exist here, so there is nothing to sandbox.
- Unknown components throw (`Component "Map" is not in this client's catalog`) rather than
  degrading silently. Try adding `{ Map: {...} }` to a surface and watch it refuse.
- All styling lives in `web/index.html` under `.skin-plain` / `.skin-bold`. The
  "Switch A2UI design system" button swaps skins while the agent's JSON stays byte-identical —
  that's the property this side buys you.
