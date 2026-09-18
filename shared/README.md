# Shared domain

`flights.ts` is the only code all three sides import. Keeping the search and booking
logic identical is what makes the comparison honest: the sole variable between the
panes is how the result reaches the screen.

`../mcp-apps/server.ts`, `../a2ui/agent.ts` and `../ag-ui/agent.ts` all call
`searchFlights` and `bookFlight` here. None of them owns any domain logic of its own.
