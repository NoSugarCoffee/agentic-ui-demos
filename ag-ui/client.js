const log = (line) => {
  const pre = document.getElementById('agui-log');
  pre.textContent += line + '\n';
  pre.scrollTop = pre.scrollHeight;
};

const THREAD_ID = `thread_${Math.random().toString(36).slice(2, 9)}`;

// Minimal RFC 6902 for the operations this agent emits.
const applyPatch = (state, operations) =>
  operations.reduce((current, operation) => {
    const segments = operation.path.split('/').slice(1);
    const key = segments[segments.length - 1];
    const parent = segments.slice(0, -1).reduce((node, segment) => node[segment], current);
    const next = { ...current };
    const nextParent = segments.length === 1 ? next : parent;
    if (operation.op === 'remove') delete nextParent[key];
    else nextParent[key] = operation.value;
    return next;
  }, { ...state });

const streamRun = async (body, onEvent) => {
  const response = await fetch('/ag-ui/run', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...body, threadId: THREAD_ID })
  });
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    const frames = buffer.split('\n\n');
    buffer = frames.pop();
    for (const frame of frames) {
      if (frame.startsWith('data: ')) onEvent(JSON.parse(frame.slice(6)));
    }
  }
};

// Every pixel below is decided here, by the frontend. The agent sent state, not UI.
const paint = (state, transcript) => {
  const surface = document.getElementById('agui-surface');
  const parts = [];

  if (transcript.length > 0) {
    const bubble = document.createElement('p');
    bubble.className = 'ag-message';
    bubble.textContent = transcript;
    parts.push(bubble);
  }

  if (state.booking !== null && state.booking !== undefined) {
    const card = document.createElement('div');
    card.className = 'ag-confirmation';
    card.innerHTML = `${state.headline}<br /><span class="ag-ref">${state.booking.reference}</span>`;
    parts.push(card);
  } else if (state.flights.length > 0) {
    const heading = document.createElement('h3');
    heading.className = 'ag-heading';
    heading.textContent = state.headline;
    parts.push(heading);
    parts.push(...state.flights.map(flight => {
      const row = document.createElement('button');
      row.className = 'ag-row';
      row.innerHTML =
        `<span><strong>${flight.carrier} ${flight.id}</strong><br />
           <span class="ag-times">${flight.depart} &rarr; ${flight.arrive}</span></span>
         <span class="ag-price">$${flight.priceUsd}</span>`;
      row.onclick = () => book(flight.id);
      return row;
    }));
  }

  surface.replaceChildren(...parts);
};

let state = { headline: '', flights: [], booking: null };
let transcript = '';

const consume = (event) => {
  switch (event.type) {
    case 'TEXT_MESSAGE_START':
      transcript = '';
      break;
    case 'TEXT_MESSAGE_CONTENT':
      transcript += event.delta;
      break;
    case 'STATE_SNAPSHOT':
      state = event.snapshot;
      log(`STATE_SNAPSHOT  ${state.flights.length} flights`);
      break;
    case 'STATE_DELTA':
      state = applyPatch(state, event.delta);
      log(`STATE_DELTA     ${event.delta.map(op => `${op.op} ${op.path}`).join(', ')}`);
      break;
    case 'TOOL_CALL_START':
      log(`TOOL_CALL_START ${event.toolCallName}`);
      break;
    case 'TOOL_CALL_RESULT':
      log(`TOOL_CALL_RESULT ${event.content}`);
      break;
    case 'RUN_STARTED':
      log(`RUN_STARTED     ${event.runId}`);
      break;
    case 'RUN_FINISHED':
      log(`RUN_FINISHED    ${event.runId}`);
      break;
  }
  paint(state, transcript);
};

const book = (flightId) => streamRun({ kind: 'book', flightId }, consume);

export const runAgUi = async (maxPriceUsd) => {
  document.getElementById('agui-log').textContent = '';
  state = { headline: '', flights: [], booking: null };
  transcript = '';
  await streamRun({ kind: 'search', maxPriceUsd }, consume);
};
