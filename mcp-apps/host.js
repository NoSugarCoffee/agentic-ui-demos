const ENDPOINT = '/mcp';

let nextId = 1;

const rpc = async (method, params) => {
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id: nextId++, method, params })
  });
  const message = await response.json();
  if (message.error) throw new Error(message.error.message);
  return message.result;
};

const log = (line) => {
  const pre = document.getElementById('mcp-log');
  pre.textContent += line + '\n';
  pre.scrollTop = pre.scrollHeight;
};

// A host does three things: find the template the tool points at, fetch it, sandbox it.
export const runMcpApp = async (maxPriceUsd) => {
  document.getElementById('mcp-log').textContent = '';

  const { tools } = await rpc('tools/list');
  const tool = tools.find(candidate => candidate.name === 'search_flights');
  const templateUri = tool._meta?.['mcp/ui']?.resourceUri;
  if (templateUri === undefined) throw new Error('search_flights declares no UI template');
  log(`tools/list -> _meta["mcp/ui"].resourceUri = ${templateUri}`);

  const result = await rpc('tools/call', { name: 'search_flights', arguments: { maxPriceUsd } });
  log(`tools/call search_flights -> ${result.structuredContent.flights.length} flights`);

  const resource = await rpc('resources/read', { uri: templateUri });
  const html = resource.contents[0].text;
  log(`resources/read -> ${html.length} bytes of text/html`);

  const frame = document.createElement('iframe');
  frame.sandbox = 'allow-scripts';
  frame.srcdoc = html;
  frame.style.height = `${tool._meta['mcp/ui'].preferredSize?.height ?? 300}px`;

  const bridge = async (event) => {
    if (event.source !== frame.contentWindow) return;
    const message = event.data;

    if (message.method === 'notifications/ui/ready') {
      log('iframe -> notifications/ui/ready');
      frame.contentWindow.postMessage({ jsonrpc: '2.0', method: 'ui/render', params: result }, '*');
      return;
    }
    if (message.method === 'notifications/ui/sizeChanged') {
      frame.style.height = `${message.params.height + 8}px`;
      return;
    }
    if (message.method === 'tools/call') {
      log(`iframe -> tools/call ${message.params.name} ${JSON.stringify(message.params.arguments)}`);
      try {
        const toolResult = await rpc('tools/call', message.params);
        frame.contentWindow.postMessage({ jsonrpc: '2.0', id: message.id, result: toolResult }, '*');
      } catch (error) {
        frame.contentWindow.postMessage(
          { jsonrpc: '2.0', id: message.id, error: { code: -32603, message: error.message } }, '*');
      }
    }
  };

  window.addEventListener('message', bridge);
  const mount = document.getElementById('mcp-surface');
  mount.replaceChildren(frame);
};
