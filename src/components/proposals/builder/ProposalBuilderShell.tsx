'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import ClientInfoForm, { type ClientInfo } from './ClientInfoForm';
import ProductSidebar from './ProductSidebar';
import LineItemsTable, { type LineItem } from './LineItemsTable';
import PersonalNoteEditor from './PersonalNoteEditor';
import TotalsSection from './TotalsSection';
import PdfPreviewModal from './PdfPreviewModal';
import type { GenerateDocumentOptions, PdfLineItem } from '@/lib/inventory-pdf/types';

const DEFAULT_CLIENT_INFO: ClientInfo = {
  clientName: '',
  clientEmail: '',
  clientPhone: '',
  eventType: '',
  eventDate: '',
  venueName: '',
  venueCity: '',
};

export default function ProposalBuilderShell() {
  const searchParams = useSearchParams();
  const cardId = searchParams.get('cardId');
  const draftId = searchParams.get('draftId');

  const [clientInfo, setClientInfo] = useState<ClientInfo>(DEFAULT_CLIENT_INFO);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [personalNote, setPersonalNote] = useState('');
  const [surcharges, setSurcharges] = useState<{ label: string; amount: number; ruleId: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(draftId);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load existing draft
  useEffect(() => {
    if (!draftId) return;
    setLoading(true);
    fetch(`/api/proposals/builder/${draftId}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.data) {
          const d = res.data;
          setClientInfo({
            clientName: d.client_name || d.card?.title || '',
            clientEmail: d.client_email_address || d.card?.client_email || '',
            clientPhone: d.client_phone || d.card?.client_phone || '',
            eventType: d.event_type || d.card?.event_type || '',
            eventDate: d.event_date || d.card?.event_date || '',
            venueName: d.venue_name || d.card?.venue_name || '',
            venueCity: d.venue_city || d.card?.venue_city || '',
          });
          setPersonalNote(d.personal_note || '');
          if (d.line_items?.length) {
            setLineItems(
              d.line_items.map((item: any, i: number) => ({
                id: `loaded-${i}`,
                productId: item.productId,
                name: item.product || item.name || '',
                category: item.category || 'other',
                quantity: item.quantity || 1,
                unitPrice: item.unitPrice || item.totalPrice || 0,
                notes: item.notes || '',
              }))
            );
          }
        }
      })
      .finally(() => setLoading(false));
  }, [draftId]);

  // Load card data if cardId provided
  useEffect(() => {
    if (!cardId || draftId) return;
    setLoading(true);
    fetch(`/api/cards/${cardId}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.data) {
          const c = res.data;
          setClientInfo({
            clientName: c.title || '',
            clientEmail: c.client_email || '',
            clientPhone: c.client_phone || '',
            eventType: c.event_type || '',
            eventDate: c.event_date || '',
            venueName: c.venue_name || '',
            venueCity: c.venue_city || '',
          });
        }
      })
      .finally(() => setLoading(false));
  }, [cardId, draftId]);

  // Track dirty state
  const handleClientInfoChange = useCallback((info: ClientInfo) => {
    setClientInfo(info);
    setIsDirty(true);
  }, []);

  const handleLineItemsChange = useCallback((items: LineItem[]) => {
    setLineItems(items);
    setIsDirty(true);
  }, []);

  const handleNoteChange = useCallback((note: string) => {
    setPersonalNote(note);
    setIsDirty(true);
  }, []);

  // Add product from sidebar
  const handleAddProduct = useCallback((product: any) => {
    const newItem: LineItem = {
      id: crypto.randomUUID(),
      productId: product.id,
      name: product.name,
      category: product.category || 'other',
      quantity: 1,
      unitPrice: product.base_price || 0,
      notes: '',
    };
    setLineItems((prev) => [...prev, newItem]);
    setIsDirty(true);
  }, []);

  // Track which products are in the line items
  const addedProductIds = useMemo(
    () => new Set(lineItems.filter((i) => i.productId).map((i) => i.productId!)),
    [lineItems]
  );

  // Save draft
  const handleSave = async () => {
    setSaving(true);
    try {
      const subtotal = lineItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
      const surchargeTotal = surcharges.reduce((s, sc) => s + sc.amount, 0);

      const payload = {
        card_id: cardId || undefined,
        client_name: clientInfo.clientName || undefined,
        client_email_address: clientInfo.clientEmail || undefined,
        client_phone: clientInfo.clientPhone || undefined,
        event_type: clientInfo.eventType || undefined,
        event_date: clientInfo.eventDate || undefined,
        venue_name: clientInfo.venueName || undefined,
        venue_city: clientInfo.venueCity || undefined,
        personal_note: personalNote || undefined,
        line_items: lineItems.map((i) => ({
          productId: i.productId,
          product: i.name,
          category: i.category,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          totalPrice: i.quantity * i.unitPrice,
          notes: i.notes,
        })),
        total_amount: subtotal + surchargeTotal,
      };

      let res;
      if (currentDraftId) {
        res = await fetch(`/api/proposals/builder/${currentDraftId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/proposals/builder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const result = await res.json();
      if (result.data?.id) {
        setCurrentDraftId(result.data.id);
        setIsDirty(false);
        toast.success(currentDraftId ? 'Draft updated' : 'Draft saved');
      } else {
        toast.error(result.error || 'Failed to save');
      }
    } catch (err) {
      toast.error('Failed to save draft');
    } finally {
      setSaving(false);
    }
  };

  // Build PDF options
  const pdfOptions = useMemo<GenerateDocumentOptions | null>(() => {
    if (lineItems.length === 0) return null;

    const subtotal = lineItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
    const surchargeTotal = surcharges.reduce((s, sc) => s + sc.amount, 0);

    const pdfItems: PdfLineItem[] = lineItems.map((i) => ({
      id: i.id,
      name: i.name,
      category: i.category.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      quantity: i.quantity,
      rate: i.unitPrice,
      amount: i.quantity * i.unitPrice,
    }));

    return {
      documentType: 'PROPOSAL',
      project: {
        id: currentDraftId || 'new',
        name: clientInfo.clientName
          ? `${clientInfo.clientName} - ${clientInfo.eventType?.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) || 'Event'}`
          : 'New Proposal',
        status: 'Draft',
        venue: clientInfo.venueName || undefined,
        startDate: clientInfo.eventDate || undefined,
        subtotal,
        total: subtotal + surchargeTotal,
      },
      client: clientInfo.clientName
        ? {
            name: clientInfo.clientName,
            email: clientInfo.clientEmail || undefined,
            phone: clientInfo.clientPhone || undefined,
          }
        : undefined,
      items: pdfItems,
      company: {
        name: 'Carolina Balloons',
        phone: '(704) 555-1234',
        email: 'halley@carolinaballoons.com',
        website: 'carolinaballoons.com',
      },
      personalNote: personalNote || undefined,
      eventType: clientInfo.eventType || undefined,
      surcharges: surcharges.map((s) => ({ label: s.label, amount: s.amount })),
    };
  }, [lineItems, clientInfo, personalNote, surcharges, currentDraftId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-navy/40 dark:text-slate-500">
        Loading proposal...
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: Product sidebar */}
      <ProductSidebar onAddProduct={handleAddProduct} addedProductIds={addedProductIds} />

      {/* Right: Canvas */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <ClientInfoForm info={clientInfo} onChange={handleClientInfoChange} />
        <LineItemsTable items={lineItems} onChange={handleLineItemsChange} />
        <PersonalNoteEditor
          note={personalNote}
          onChange={handleNoteChange}
          clientName={clientInfo.clientName}
          eventType={clientInfo.eventType}
        />
        <TotalsSection
          items={lineItems}
          venueCity={clientInfo.venueCity}
          onSave={handleSave}
          onPreviewPdf={() => setPdfOpen(true)}
          saving={saving}
          isDirty={isDirty}
          surcharges={surcharges}
          onSurchargesChange={setSurcharges}
        />
      </div>

      {/* PDF Preview Modal */}
      <PdfPreviewModal
        open={pdfOpen}
        onClose={() => setPdfOpen(false)}
        options={pdfOptions}
      />
    </div>
  );
}
