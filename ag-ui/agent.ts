import { bookFlight, searchFlights, type Booking, type Flight } from '../shared/flights.ts';

export type JsonPatchOperation =
  | { readonly op: 'add'; readonly path: string; readonly value: unknown }
  | { readonly op: 'replace'; readonly path: string; readonly value: unknown }
  | { readonly op: 'remove'; readonly path: string };

export type AgentState = {
  readonly headline: string;
  readonly flights: readonly Flight[];
  readonly booking: Booking | null;
};

// The whole protocol surface: what happened, never what to draw.
export type AgUiEvent =
  | { readonly type: 'RUN_STARTED'; readonly threadId: string; readonly runId: string }
  | { readonly type: 'TEXT_MESSAGE_START'; readonly messageId: string; readonly role: 'assistant' }
  | { readonly type: 'TEXT_MESSAGE_CONTENT'; readonly messageId: string; readonly delta: string }
  | { readonly type: 'TEXT_MESSAGE_END'; readonly messageId: string }
  | { readonly type: 'TOOL_CALL_START'; readonly toolCallId: string; readonly toolCallName: string }
  | { readonly type: 'TOOL_CALL_ARGS'; readonly toolCallId: string; readonly delta: string }
  | { readonly type: 'TOOL_CALL_END'; readonly toolCallId: string }
  | { readonly type: 'TOOL_CALL_RESULT'; readonly toolCallId: string; readonly content: string }
  | { readonly type: 'STATE_SNAPSHOT'; readonly snapshot: AgentState }
  | { readonly type: 'STATE_DELTA'; readonly delta: readonly JsonPatchOperation[] }
  | { readonly type: 'RUN_FINISHED'; readonly threadId: string; readonly runId: string };

export type RunInput =
  | { readonly kind: 'search'; readonly threadId: string; readonly maxPriceUsd: number }
  | { readonly kind: 'book'; readonly threadId: string; readonly flightId: string };

const pause = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

const newId = (prefix: string): string => `${prefix}_${Math.random().toString(36).slice(2, 9)}`;

// Token streaming is the point: the frontend paints each delta as it lands.
async function* streamMessage(text: string): AsyncGenerator<AgUiEvent> {
  const messageId = newId('msg');
  yield { type: 'TEXT_MESSAGE_START', messageId, role: 'assistant' };
  for (const word of text.split(' ')) {
    await pause(45);
    yield { type: 'TEXT_MESSAGE_CONTENT', messageId, delta: `${word} ` };
  }
  yield { type: 'TEXT_MESSAGE_END', messageId };
}

async function* streamToolCall(name: string, args: Record<string, unknown>, result: unknown): AsyncGenerator<AgUiEvent> {
  const toolCallId = newId('call');
  yield { type: 'TOOL_CALL_START', toolCallId, toolCallName: name };
  await pause(60);
  yield { type: 'TOOL_CALL_ARGS', toolCallId, delta: JSON.stringify(args) };
  yield { type: 'TOOL_CALL_END', toolCallId };
  await pause(140);
  yield { type: 'TOOL_CALL_RESULT', toolCallId, content: JSON.stringify(result) };
}

async function* runSearch(threadId: string, maxPriceUsd: number): AsyncGenerator<AgUiEvent> {
  const runId = newId('run');
  yield { type: 'RUN_STARTED', threadId, runId };
  yield* streamMessage(`Looking for flights under $${maxPriceUsd}.`);

  const flights = searchFlights(maxPriceUsd);
  yield* streamToolCall('search_flights', { maxPriceUsd }, { count: flights.length });

  yield {
    type: 'STATE_SNAPSHOT',
    snapshot: { headline: `${flights.length} flights under $${maxPriceUsd}`, flights, booking: null }
  };
  yield { type: 'RUN_FINISHED', threadId, runId };
}

async function* runBooking(threadId: string, flightId: string): AsyncGenerator<AgUiEvent> {
  const runId = newId('run');
  yield { type: 'RUN_STARTED', threadId, runId };

  const booking = bookFlight(flightId);
  yield* streamToolCall('book_flight', { id: flightId }, { reference: booking.reference });

  // A delta, not a snapshot: the frontend patches the state it already holds.
  yield {
    type: 'STATE_DELTA',
    delta: [
      { op: 'add', path: '/booking', value: booking },
      { op: 'replace', path: '/headline', value: `Booked ${booking.flight.carrier} ${booking.flight.id}` }
    ]
  };
  yield* streamMessage(`Done — your confirmation code is ${booking.reference}.`);
  yield { type: 'RUN_FINISHED', threadId, runId };
}

export const runAgent = (input: RunInput): AsyncGenerator<AgUiEvent> =>
  input.kind === 'search'
    ? runSearch(input.threadId, input.maxPriceUsd)
    : runBooking(input.threadId, input.flightId);
