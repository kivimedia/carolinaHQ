'use client';

const EVENT_TYPES = [
  'birthday', 'wedding', 'corporate', 'baby_shower', 'graduation',
  'grand_opening', 'prom', 'anniversary', 'gender_reveal', 'holiday',
  'church', 'school', 'fundraiser', 'memorial', 'photo_shoot', 'other',
];

export interface ClientInfo {
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  eventType: string;
  eventDate: string;
  venueName: string;
  venueCity: string;
}

interface ClientInfoFormProps {
  info: ClientInfo;
  onChange: (info: ClientInfo) => void;
}

export default function ClientInfoForm({ info, onChange }: ClientInfoFormProps) {
  const update = (field: keyof ClientInfo, value: string) => {
    onChange({ ...info, [field]: value });
  };

  return (
    <div className="border border-cream-dark dark:border-slate-700 rounded-lg p-4 bg-white dark:bg-slate-800">
      <h3 className="text-sm font-semibold text-navy dark:text-white mb-3">Client & Event Details</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Left column - Client */}
        <div className="space-y-2">
          <div>
            <label className="block text-xs font-medium text-navy/60 dark:text-slate-400 mb-1">Client Name</label>
            <input
              type="text"
              value={info.clientName}
              onChange={(e) => update('clientName', e.target.value)}
              placeholder="Sarah Johnson"
              className="w-full px-3 py-1.5 text-sm rounded-md border border-cream-dark dark:border-slate-600 bg-white dark:bg-slate-700 text-navy dark:text-white focus:outline-none focus:ring-2 focus:ring-cb-pink/40"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-navy/60 dark:text-slate-400 mb-1">Email</label>
            <input
              type="email"
              value={info.clientEmail}
              onChange={(e) => update('clientEmail', e.target.value)}
              placeholder="sarah@email.com"
              className="w-full px-3 py-1.5 text-sm rounded-md border border-cream-dark dark:border-slate-600 bg-white dark:bg-slate-700 text-navy dark:text-white focus:outline-none focus:ring-2 focus:ring-cb-pink/40"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-navy/60 dark:text-slate-400 mb-1">Phone</label>
            <input
              type="tel"
              value={info.clientPhone}
              onChange={(e) => update('clientPhone', e.target.value)}
              placeholder="704-555-1234"
              className="w-full px-3 py-1.5 text-sm rounded-md border border-cream-dark dark:border-slate-600 bg-white dark:bg-slate-700 text-navy dark:text-white focus:outline-none focus:ring-2 focus:ring-cb-pink/40"
            />
          </div>
        </div>

        {/* Right column - Event */}
        <div className="space-y-2">
          <div>
            <label className="block text-xs font-medium text-navy/60 dark:text-slate-400 mb-1">Event Type</label>
            <select
              value={info.eventType}
              onChange={(e) => update('eventType', e.target.value)}
              className="w-full px-3 py-1.5 text-sm rounded-md border border-cream-dark dark:border-slate-600 bg-white dark:bg-slate-700 text-navy dark:text-white focus:outline-none focus:ring-2 focus:ring-cb-pink/40"
            >
              <option value="">Select event type...</option>
              {EVENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-navy/60 dark:text-slate-400 mb-1">Event Date</label>
            <input
              type="date"
              value={info.eventDate}
              onChange={(e) => update('eventDate', e.target.value)}
              className="w-full px-3 py-1.5 text-sm rounded-md border border-cream-dark dark:border-slate-600 bg-white dark:bg-slate-700 text-navy dark:text-white focus:outline-none focus:ring-2 focus:ring-cb-pink/40"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-navy/60 dark:text-slate-400 mb-1">Venue</label>
              <input
                type="text"
                value={info.venueName}
                onChange={(e) => update('venueName', e.target.value)}
                placeholder="Venue name"
                className="w-full px-3 py-1.5 text-sm rounded-md border border-cream-dark dark:border-slate-600 bg-white dark:bg-slate-700 text-navy dark:text-white focus:outline-none focus:ring-2 focus:ring-cb-pink/40"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy/60 dark:text-slate-400 mb-1">City</label>
              <input
                type="text"
                value={info.venueCity}
                onChange={(e) => update('venueCity', e.target.value)}
                placeholder="Charlotte"
                className="w-full px-3 py-1.5 text-sm rounded-md border border-cream-dark dark:border-slate-600 bg-white dark:bg-slate-700 text-navy dark:text-white focus:outline-none focus:ring-2 focus:ring-cb-pink/40"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
