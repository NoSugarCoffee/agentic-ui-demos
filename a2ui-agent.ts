import { bookFlight, searchFlights, type Flight } from './flights.ts';

export type ValueRef = { readonly literal: string } | { readonly path: string };

export type ComponentNode =
  | { readonly Column: { readonly children: readonly string[] } }
  | { readonly Card: { readonly child: string } }
  | { readonly Heading: { readonly text: ValueRef } }
  | { readonly Text: { readonly text: ValueRef } }
  | { readonly List: { readonly itemsPath: string; readonly template: string } }
  | {
      readonly Button: {
        readonly label: ValueRef;
        readonly trailing?: ValueRef;
        readonly action: { readonly name: string; readonly context: readonly { readonly key: string; readonly path: string }[] };
      };
    };

export type ComponentDef = { readonly id: string; readonly component: ComponentNode };

export type A2uiMessage = {
  readonly surfaceUpdate: readonly ComponentDef[];
  readonly dataModelUpdate: Record<string, unknown>;
  readonly beginRendering: { readonly root: string };
};

export type UserAction = { readonly name: string; readonly context: Record<string, string> };

const describe = (flight: Flight): string =>
  `${flight.depart} → ${flight.arrive} · ${flight.stops === 0 ? 'nonstop' : `${flight.stops} stop`}`;

export const searchSurface = (maxPriceUsd: number): A2uiMessage => {
  const flights = searchFlights(maxPriceUsd);
  return {
    surfaceUpdate: [
      { id: 'root', component: { Column: { children: ['title', 'list'] } } },
      { id: 'title', component: { Heading: { text: { path: '/headline' } } } },
      { id: 'list', component: { List: { itemsPath: '/flights', template: 'flightRow' } } },
      {
        id: 'flightRow',
        component: {
          Button: {
            label: { path: 'item/label' },
            trailing: { path: 'item/price' },
            action: { name: 'book_flight', context: [{ key: 'id', path: 'item/id' }] }
          }
        }
      }
    ],
    dataModelUpdate: {
      '/headline': `${flights.length} flights under $${maxPriceUsd}`,
      '/flights': flights.map(flight => ({
        id: flight.id,
        label: `${flight.carrier} ${flight.id}\n${describe(flight)}`,
        price: `$${flight.priceUsd}`
      }))
    },
    beginRendering: { root: 'root' }
  };
};

const bookedSurface = (id: string): A2uiMessage => {
  const booking = bookFlight(id);
  return {
    surfaceUpdate: [
      { id: 'root', component: { Card: { child: 'confirmation' } } },
      { id: 'confirmation', component: { Column: { children: ['confirmHead', 'confirmRef'] } } },
      { id: 'confirmHead', component: { Heading: { text: { path: '/confirmed' } } } },
      { id: 'confirmRef', component: { Text: { text: { path: '/reference' } } } }
    ],
    dataModelUpdate: {
      '/confirmed': `Booked ${booking.flight.carrier} ${booking.flight.id}`,
      '/reference': booking.reference
    },
    beginRendering: { root: 'root' }
  };
};

export const handleAction = (action: UserAction): A2uiMessage => {
  if (action.name === 'book_flight') {
    return bookedSurface(action.context.id);
  }
  throw new Error(`Unsupported A2UI action "${action.name}"`);
};
