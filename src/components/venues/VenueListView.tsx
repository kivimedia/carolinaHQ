'use client';

import { useState, useEffect, useCallback } from 'react';

interface Venue {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  contact_name: string | null;
  contact_email: string | null;
  venue_type: string | null;
  friendor_email_sent: boolean;
  friendor_email_sent_at: string | null;
  relationship_status: string;
  source: string | null;
  notes: string | null;
  created_at: string;
}

const VENUE_TYPES = ['hotel', 'event_space', 'church', 'school', 'corporate', 'park', 'restaurant', 'country_club', 'other'];
const RELATIONSHIP_STATUSES = ['new', 'contacted', 'active_partner', 'inactive'];

interface FriendorDraft {
  venueId: string;
  to: string;
  subject: string;
  body: string;
}

export default function VenueListView() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [search, setSearch] = useState('');
  const [draftingVenueId, setDraftingVenueId] = useState<string | null>(null);
  const [friendorDraft, setFriendorDraft] = useState<FriendorDraft | null>(null);
  const [sendingDraft, setSendingDraft] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('NC');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [venueType, setVenueType] = useState('');
  const [notes, setNotes] = useState('');

  const fetchVenues = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/venues');
      const json = await res.json();
      if (json.ok) setVenues(json.data || []);
    } catch (err) {
      console.error('Failed to fetch venues:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchVenues(); }, [fetchVenues]);

  const resetForm = () => {
    setName(''); setAddress(''); setCity(''); setState('NC');
    setContactName(''); setContactEmail(''); setVenueType(''); setNotes('');
    setEditingId(null); setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name, address: address || null, city: city || null, state: state || 'NC',
      contact_name: contactName || null, contact_email: contactEmail || null,
      venue_type: venueType || null, notes: notes || null,
    };

    try {
      if (editingId) {
        await fetch(`/api/venues/${editingId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      } else {
        await fetch('/api/venues', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, source: 'manual' }) });
      }
      resetForm();
      fetchVenues();
    } catch (err) {
      console.error('Save failed:', err);
    }
  };

  const handleEdit = (v: Venue) => {
    setName(v.name); setAddress(v.address || ''); setCity(v.city || '');
    setState(v.state || 'NC'); setContactName(v.contact_name || '');
    setContactEmail(v.contact_email || ''); setVenueType(v.venue_type || '');
    setNotes(v.notes || ''); setEditingId(v.id); setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this venue?')) return;
    await fetch(`/api/venues/${id}`, { method: 'DELETE' });
    fetchVenues();
  };

  const handleDraftFriendor = async (venue: Venue) => {
    setDraftingVenueId(venue.id);
    try {
      const res = await fetch(`/api/venues/${venue.id}/friendor-draft`, { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        setFriendorDraft({
          venueId: venue.id,
          to: json.data.to,
          subject: json.data.subject,
          body: json.data.body,
        });
      } else {
        alert('Failed to generate AI draft. Check AI budget or try again.');
      }
    } catch (err) {
      console.error('Draft friendor email failed:', err);
      alert('Failed to generate AI draft.');
    } finally {
      setDraftingVenueId(null);
    }
  };

  const handleSendFriendor = async () => {
    if (!friendorDraft) return;
    setSendingDraft(true);
    try {
      // Create Gmail draft
      const res = await fetch('/api/email/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: friendorDraft.to,
          subject: friendorDraft.subject,
          body: friendorDraft.body,
        }),
      });
      if (res.ok) {
        // Mark friendor email as sent
        await fetch(`/api/venues/${friendorDraft.venueId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            friendor_email_sent: true,
            friendor_email_sent_at: new Date().toISOString(),
            relationship_status: 'contacted',
          }),
        });
        setFriendorDraft(null);
        fetchVenues();
        alert('Friendor email draft created in Gmail!');
      } else {
        alert('Failed to create Gmail draft. Is Google connected?');
      }
    } catch (err) {
      console.error('Send friendor email failed:', err);
      alert('Failed to send. Check your Google integration.');
    } finally {
      setSendingDraft(false);
    }
  };

  const filtered = venues.filter((v) => {
    if (filterStatus && v.relationship_status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      return v.name.toLowerCase().includes(q) || (v.city || '').toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search venues..."
          className="px-3 py-2 text-sm border rounded-lg w-64 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 text-sm border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
        >
          <option value="">All Statuses</option>
          {RELATIONSHIP_STATUSES.map((s) => (
            <option key={s} value={s}>{s.replace('_', ' ')}</option>
          ))}
        </select>
        <span className="text-sm text-gray-400">{filtered.length} venue{filtered.length !== 1 ? 's' : ''}</span>
        <div className="flex-1" />
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 text-sm font-medium transition-colors"
        >
          Add Venue
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="border rounded-lg p-4 dark:border-gray-700 bg-white dark:bg-gray-800/50 space-y-3">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Venue name *" required className="px-3 py-2 text-sm border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100" />
            <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Address" className="px-3 py-2 text-sm border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100" />
            <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" className="px-3 py-2 text-sm border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100" />
            <input type="text" value={state} onChange={(e) => setState(e.target.value)} placeholder="State" className="px-3 py-2 text-sm border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100" />
            <input type="text" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Contact name" className="px-3 py-2 text-sm border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100" />
            <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="Contact email" className="px-3 py-2 text-sm border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100" />
            <select value={venueType} onChange={(e) => setVenueType(e.target.value)} className="px-3 py-2 text-sm border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100">
              <option value="">Venue type</option>
              {VENUE_TYPES.map((t) => (<option key={t} value={t}>{t.replace('_', ' ')}</option>))}
            </select>
          </div>
          <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes" className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100" />
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">{editingId ? 'Update' : 'Add'}</button>
            <button type="button" onClick={resetForm} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200">Cancel</button>
          </div>
        </form>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500" />
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden dark:border-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Venue</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">City</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Contact</th>
                <th className="px-3 py-2.5 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="px-3 py-2.5 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Friendor</th>
                <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
              {filtered.map((venue) => (
                <tr key={venue.id}>
                  <td className="px-3 py-2.5">
                    <span className="font-medium text-gray-900 dark:text-gray-100">{venue.name}</span>
                    {venue.notes && <span className="block text-xs text-gray-400 mt-0.5 truncate max-w-[200px]">{venue.notes}</span>}
                  </td>
                  <td className="px-3 py-2.5 text-gray-600 dark:text-gray-300">{venue.city || '—'}</td>
                  <td className="px-3 py-2.5 text-gray-600 dark:text-gray-300 capitalize">{venue.venue_type?.replace('_', ' ') || '—'}</td>
                  <td className="px-3 py-2.5">
                    {venue.contact_name && <span className="block text-gray-900 dark:text-gray-100 text-xs">{venue.contact_name}</span>}
                    {venue.contact_email && <span className="block text-gray-400 text-xs">{venue.contact_email}</span>}
                    {!venue.contact_name && !venue.contact_email && <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                      venue.relationship_status === 'active_partner' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                      venue.relationship_status === 'contacted' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                      venue.relationship_status === 'inactive' ? 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400' :
                      'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                    }`}>
                      {venue.relationship_status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {venue.friendor_email_sent ? (
                      <span className="text-xs text-green-600 dark:text-green-400">Sent</span>
                    ) : venue.contact_email ? (
                      <button
                        onClick={() => handleDraftFriendor(venue)}
                        disabled={draftingVenueId === venue.id}
                        className="text-xs text-pink-600 hover:text-pink-700 dark:text-pink-400 disabled:opacity-50"
                      >
                        {draftingVenueId === venue.id ? 'Drafting...' : 'Draft Email'}
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400">No email</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <button onClick={() => handleEdit(venue)} className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 mr-2">Edit</button>
                    <button onClick={() => handleDelete(venue.id)} className="text-xs text-red-600 hover:text-red-700 dark:text-red-400">Delete</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-8 text-center text-gray-400">No venues found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Friendor Draft Preview Modal */}
      {friendorDraft && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-xl w-full max-h-[80vh] overflow-y-auto shadow-xl">
            <div className="p-5 border-b dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Friendor Email Preview</h3>
              <p className="text-xs text-gray-500 mt-1">AI-generated draft. Review and edit before sending to Gmail.</p>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">To</label>
                <p className="text-sm text-gray-900 dark:text-gray-100">{friendorDraft.to}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Subject</label>
                <input
                  type="text"
                  value={friendorDraft.subject}
                  onChange={(e) => setFriendorDraft({ ...friendorDraft, subject: e.target.value })}
                  className="w-full px-3 py-2 text-sm border rounded-lg mt-1 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Body</label>
                <textarea
                  value={friendorDraft.body}
                  onChange={(e) => setFriendorDraft({ ...friendorDraft, body: e.target.value })}
                  rows={10}
                  className="w-full px-3 py-2 text-sm border rounded-lg mt-1 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                />
              </div>
            </div>
            <div className="p-5 border-t dark:border-gray-700 flex justify-end gap-2">
              <button
                onClick={() => setFriendorDraft(null)}
                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleSendFriendor}
                disabled={sendingDraft}
                className="px-4 py-2 text-sm text-white bg-pink-600 rounded-lg hover:bg-pink-700 disabled:opacity-50 font-medium"
              >
                {sendingDraft ? 'Creating Draft...' : 'Create Gmail Draft'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
