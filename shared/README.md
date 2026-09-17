# Shared domain

`flights.ts` is the only code both sides import. Keeping the search and booking
logic identical is what makes the comparison honest: the sole variable between
the two panes is how the result gets rendered.

Both `../mcp-apps/server.ts` and `../a2ui/agent.ts` call `searchFlights` and
`bookFlight` here. Neither owns any domain logic of its own.
