// Event types for proposal templates
export const EVENT_TYPES = [
  'Birthday Party',
  'Wedding',
  'Baby Shower',
  'Graduation',
  'Corporate Event',
  'Sweet 16',
  'Quinceanera',
  'Anniversary',
  'Holiday Party',
  'Gender Reveal',
  'Bridal Shower',
  'Prom',
  'Other',
] as const;

export type EventType = typeof EVENT_TYPES[number];
