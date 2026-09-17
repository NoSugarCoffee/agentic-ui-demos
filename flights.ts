export type Flight = {
  readonly id: string;
  readonly carrier: string;
  readonly depart: string;
  readonly arrive: string;
  readonly stops: number;
  readonly priceUsd: number;
};

export type Booking = {
  readonly reference: string;
  readonly flight: Flight;
};

const CATALOG: readonly Flight[] = [
  { id: 'UA118', carrier: 'United', depart: '07:15', arrive: '10:40', stops: 0, priceUsd: 412 },
  { id: 'DL204', carrier: 'Delta', depart: '09:30', arrive: '13:05', stops: 0, priceUsd: 388 },
  { id: 'AA771', carrier: 'American', depart: '12:00', arrive: '17:55', stops: 1, priceUsd: 297 },
  { id: 'B6355', carrier: 'JetBlue', depart: '18:45', arrive: '22:10', stops: 0, priceUsd: 455 }
];

export const searchFlights = (maxPriceUsd: number): readonly Flight[] =>
  CATALOG.filter(flight => flight.priceUsd <= maxPriceUsd);

export const bookFlight = (id: string): Booking => {
  const flight = CATALOG.find(candidate => candidate.id === id);
  if (flight === undefined) {
    throw new Error(`No flight with id "${id}". Known ids: ${CATALOG.map(f => f.id).join(', ')}`);
  }
  return { reference: `${flight.id}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`, flight };
};
