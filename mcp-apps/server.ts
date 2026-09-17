import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { bookFlight, searchFlights } from '../shared/flights.ts';

const WIDGET_URI = 'ui://widget/flight-picker.html';

// Served only through resources/read, never over plain HTTP: the UI travels on the protocol.
const widgetHtml = (): string => readFileSync(new URL('./widget.html', import.meta.url), 'utf8');

export const createMcpServer = (): McpServer => {
  const server = new McpServer({ name: 'flights-mcp-apps', version: '1.0.0' });

  server.registerResource(
    'flight-picker',
    WIDGET_URI,
    { title: 'Flight picker', mimeType: 'text/html' },
    async () => ({ contents: [{ uri: WIDGET_URI, mimeType: 'text/html', text: widgetHtml() }] })
  );

  server.registerTool(
    'search_flights',
    {
      title: 'Search flights',
      description: 'Find flights under a price cap',
      inputSchema: { maxPriceUsd: z.number() },
      // The link from tool result to UI template. Key name has moved across SEP-1865 revisions
      // and differs from the OpenAI Apps SDK ("openai/outputTemplate") - check your host.
      _meta: { 'mcp/ui': { resourceUri: WIDGET_URI, preferredSize: { height: 420 } } }
    },
    async ({ maxPriceUsd }) => {
      const flights = searchFlights(maxPriceUsd);
      return {
        content: [{ type: 'text', text: `Found ${flights.length} flights under $${maxPriceUsd}.` }],
        structuredContent: { flights }
      };
    }
  );

  server.registerTool(
    'book_flight',
    {
      title: 'Book flight',
      description: 'Book a flight by id',
      inputSchema: { id: z.string() }
    },
    async ({ id }) => {
      const booking = bookFlight(id);
      return {
        content: [{ type: 'text', text: `Booked ${booking.flight.carrier} ${booking.flight.id}.` }],
        structuredContent: booking
      };
    }
  );

  return server;
};
