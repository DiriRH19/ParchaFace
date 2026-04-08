export const EVENT_CATEGORIES = [
  'Música',
  'Gaming',
  'Fiestas',
  'Networking',
  'Deportes',
  'Gastronomía'
] as const;

export type EventCategory = (typeof EVENT_CATEGORIES)[number];
