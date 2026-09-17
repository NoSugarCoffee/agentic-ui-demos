const log = (line) => {
  const pre = document.getElementById('a2ui-log');
  pre.textContent += line + '\n';
  pre.scrollTop = pre.scrollHeight;
};

const resolve = (ref, item, dataModel) => {
  if ('literal' in ref) return ref.literal;
  return ref.path.startsWith('item/') ? item[ref.path.slice(5)] : dataModel[ref.path];
};

// The whole client: a fixed catalog mapping component names to this app's own widgets.
// Nothing here came from the agent, so nothing the agent sends can execute.
const CATALOG = {
  Column: (props, ctx) => {
    const element = document.createElement('div');
    element.className = 'a2-column';
    element.append(...props.children.map(childId => build(childId, ctx)));
    return element;
  },
  Card: (props, ctx) => {
    const element = document.createElement('div');
    element.className = 'a2-card';
    element.append(build(props.child, ctx));
    return element;
  },
  Heading: (props, ctx) => {
    const element = document.createElement('h3');
    element.className = 'a2-heading';
    element.textContent = resolve(props.text, ctx.item, ctx.dataModel);
    return element;
  },
  Text: (props, ctx) => {
    const element = document.createElement('p');
    element.className = 'a2-text';
    element.textContent = resolve(props.text, ctx.item, ctx.dataModel);
    return element;
  },
  List: (props, ctx) => {
    const element = document.createElement('div');
    element.className = 'a2-list';
    const items = ctx.dataModel[props.itemsPath] ?? [];
    element.append(...items.map(item => build(props.template, { ...ctx, item })));
    return element;
  },
  Button: (props, ctx) => {
    const element = document.createElement('button');
    element.className = 'a2-button';
    const label = document.createElement('span');
    label.className = 'a2-button-label';
    label.textContent = resolve(props.label, ctx.item, ctx.dataModel);
    element.append(label);
    if (props.trailing !== undefined) {
      const trailing = document.createElement('span');
      trailing.className = 'a2-button-trailing';
      trailing.textContent = resolve(props.trailing, ctx.item, ctx.dataModel);
      element.append(trailing);
    }
    const context = Object.fromEntries(
      props.action.context.map(({ key, path }) => [key, resolve({ path }, ctx.item, ctx.dataModel)])
    );
    element.onclick = () => ctx.dispatch({ name: props.action.name, context });
    return element;
  }
};

const build = (componentId, ctx) => {
  const definition = ctx.components.get(componentId);
  if (definition === undefined) throw new Error(`Unknown component id "${componentId}"`);
  const [type, props] = Object.entries(definition.component)[0];
  const factory = CATALOG[type];
  if (factory === undefined) throw new Error(`Component "${type}" is not in this client's catalog`);
  return factory(props, ctx);
};

const post = async (path, body) => {
  const response = await fetch(path, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body)
  });
  const message = await response.json();
  if (message.error) throw new Error(message.error);
  return message;
};

const paint = (message) => {
  log(`surfaceUpdate: ${message.surfaceUpdate.map(c => Object.keys(c.component)[0]).join(', ')}`);
  log(`dataModelUpdate: ${Object.keys(message.dataModelUpdate).join(', ')}`);
  const ctx = {
    components: new Map(message.surfaceUpdate.map(definition => [definition.id, definition])),
    dataModel: message.dataModelUpdate,
    item: undefined,
    dispatch: async (action) => {
      log(`action -> ${action.name} ${JSON.stringify(action.context)}`);
      paint(await post('/a2ui/action', action));
    }
  };
  document.getElementById('a2ui-surface').replaceChildren(build(message.beginRendering.root, ctx));
};

export const runA2ui = async (maxPriceUsd) => {
  document.getElementById('a2ui-log').textContent = '';
  paint(await post('/a2ui/search', { maxPriceUsd }));
};
