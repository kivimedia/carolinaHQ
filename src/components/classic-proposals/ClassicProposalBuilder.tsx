'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Save, Send, Plus, Trash2, Loader2, History, BookTemplate } from 'lucide-react';
import { Button } from '@/components/ui-shadcn/button';
import { Input } from '@/components/ui-shadcn/input';
import { Textarea } from '@/components/ui-shadcn/textarea';
import { Label } from '@/components/ui-shadcn/label';
import { Badge } from '@/components/ui-shadcn/badge';
import { Switch } from '@/components/ui-shadcn/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui-shadcn/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui-shadcn/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui-shadcn/alert-dialog';
import { toast } from '@/hooks/fun/use-toast';
import { useSaveProposal, useProposal } from '@/hooks/fun/use-proposals';
import { useSaveTemplate } from '@/hooks/fun/use-templates';
import { useTemplate } from '@/hooks/fun/use-templates';
import { useSaveRevision, useRevisions } from '@/hooks/fun/use-revisions';
import { useProducts, type DbProduct } from '@/hooks/fun/use-products';
import { useOptions } from '@/hooks/fun/use-options';
import { useUserSettings } from '@/hooks/fun/use-user-settings';
import { usePricingRules, calculateDeliveryFee } from '@/hooks/fun/use-pricing-rules';
import { useTags, useProposalTags, useSetProposalTags } from '@/hooks/fun/use-tags';

interface BuilderLineItem {
  id: string;
  product: DbProduct;
  selectedSize: string;
  selectedColor: string;
  quantity: number;
  unitPrice: number;
  notes: string;
}

interface BuilderOption {
  id: string;
  name: string;
  display_price: number;
}

interface ProposalSurcharge {
  label: string;
  amount: number;
  enabled: boolean;
}

const INITIAL = {
  clientName: '', clientEmail: '', clientPhone: '', eventType: '', eventDate: '',
  venue: '', startTime: '', guests: '', colorTheme: '', notes: '', personalNote: '', leadSource: '',
};

export default function ClassicProposalBuilder({ proposalId: propId }: { proposalId?: string } = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams.get('template') || undefined;
  const editId = propId || searchParams.get('edit') || undefined;

  const [form, setForm] = useState(INITIAL);
  const [lineItems, setLineItems] = useState<BuilderLineItem[]>([]);
  const [options, setOptions] = useState<BuilderOption[]>([]);
  const [proposalId, setProposalId] = useState<string | undefined>(editId);
  const [initialized, setInitialized] = useState(false);
  const [surcharges, setSurcharges] = useState<ProposalSurcharge[]>([]);
  const [surchargesInitialized, setSurchargesInitialized] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  const saveProposal = useSaveProposal();
  const saveTemplate = useSaveTemplate();
  const saveRevision = useSaveRevision();
  const { data: pricingRules = [] } = usePricingRules();
  const { data: products = [] } = useProducts();
  const { data: allOptions = [] } = useOptions();
  const { data: settings } = useUserSettings();
  const { data: templateData } = useTemplate(templateId);
  const { data: existingProposal } = useProposal(editId);
  const { data: revisions = [] } = useRevisions(proposalId);
  const { data: allTags = [] } = useTags();
  const { data: existingTagIds = [] } = useProposalTags(proposalId);
  const setProposalTags = useSetProposalTags();

  const itemLabel = settings?.item_label || 'designs';

  useEffect(() => { if (existingTagIds.length > 0) setSelectedTagIds(existingTagIds); }, [existingTagIds]);

  // Initialize surcharges from settings
  useEffect(() => {
    if (surchargesInitialized || !settings) return;
    const settingSurcharges = settings.surcharges || [];
    setSurcharges([
      { label: 'Delivery & Setup', amount: calculateDeliveryFee(pricingRules), enabled: true },
      ...settingSurcharges.filter((s) => s.enabled).map((s) => ({
        label: s.label, amount: parseFloat(s.value.replace(/[^0-9.]/g, '')) || 0, enabled: false,
      })),
    ]);
    setSurchargesInitialized(true);
  }, [settings, pricingRules, surchargesInitialized]);

  // Load from template
  useEffect(() => {
    if (initialized || products.length === 0) return;
    if (templateId && templateData) {
      const items: BuilderLineItem[] = templateData.default_line_items.map((li) => {
        const product = products.find((p) => p.id === li.product_id);
        if (!product) return null;
        return { id: crypto.randomUUID(), product, selectedSize: li.selected_size, selectedColor: li.selected_color, quantity: li.quantity, unitPrice: li.unit_price, notes: '' };
      }).filter(Boolean) as BuilderLineItem[];
      setLineItems(items);
      setForm((prev) => ({ ...prev, personalNote: templateData.default_personal_note, notes: templateData.default_notes }));
      setInitialized(true);
    }
  }, [templateId, templateData, products, initialized]);

  // Load existing proposal
  useEffect(() => {
    if (initialized || products.length === 0) return;
    if (editId && existingProposal) {
      const { proposal: p, lineItems: items } = existingProposal;
      const builtItems: BuilderLineItem[] = items.map((item) => {
        const product = products.find((pr) => pr.id === item.product_id);
        if (!product) return null;
        return { id: item.id, product, selectedSize: item.selected_size || '', selectedColor: item.selected_color || 'Custom', quantity: item.quantity || 1, unitPrice: item.unit_price, notes: item.notes || '' };
      }).filter(Boolean) as BuilderLineItem[];

      const selectedOptionIds = (p as any).selected_option_ids || [];
      const restoredOptions: BuilderOption[] = selectedOptionIds.map((optId: string) => {
        const opt = allOptions.find((o) => o.id === optId);
        if (!opt) return null;
        return { id: opt.id, name: opt.name, display_price: opt.display_price || 0 };
      }).filter(Boolean) as BuilderOption[];

      setForm({
        clientName: p.client_name || '', clientEmail: p.client_email || '', clientPhone: p.client_phone || '',
        eventType: p.event_type || '', eventDate: p.event_date || '', venue: p.venue || '',
        startTime: (p as any).start_time || '', guests: p.guests || '', colorTheme: p.color_theme || '',
        notes: p.notes || '', personalNote: p.personal_note || '', leadSource: p.lead_source || '',
      });
      setLineItems(builtItems);
      setOptions(restoredOptions);
      setProposalId(editId);
      setInitialized(true);
    }
  }, [editId, existingProposal, products, initialized, allOptions]);

  useEffect(() => { if (!templateId && !editId && !initialized) setInitialized(true); }, [templateId, editId, initialized]);

  const handleFormChange = useCallback((updates: Partial<typeof INITIAL>) => setForm((prev) => ({ ...prev, ...updates })), []);

  const handleAddProduct = useCallback((productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    const defaultSize = product.sizes[1] || product.sizes[0];
    if (!defaultSize) return;
    setLineItems((prev) => [...prev, {
      id: crypto.randomUUID(), product, selectedSize: defaultSize.name,
      selectedColor: product.color_presets[0] || 'Custom', quantity: 1, unitPrice: defaultSize.price, notes: '',
    }]);
  }, [products]);

  const handleAddOption = useCallback((optId: string) => {
    const opt = allOptions.find((o) => o.id === optId);
    if (!opt) return;
    if (options.some((o) => o.id === opt.id)) { toast({ title: 'Already added' }); return; }
    setOptions((prev) => [...prev, { id: opt.id, name: opt.name, display_price: opt.display_price || 0 }]);
  }, [allOptions, options]);

  const updateLineItem = useCallback((id: string, updates: Partial<BuilderLineItem>) => {
    setLineItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  }, []);

  const removeLineItem = useCallback((id: string) => setLineItems((prev) => prev.filter((item) => item.id !== id)), []);
  const removeOption = useCallback((id: string) => setOptions((prev) => prev.filter((o) => o.id !== id)), []);

  const lineItemSubtotal = lineItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const optionsSubtotal = options.reduce((sum, opt) => sum + opt.display_price, 0);
  const subtotal = lineItemSubtotal + optionsSubtotal;
  const surchargesTotal = surcharges.filter((s) => s.enabled).reduce((sum, s) => sum + s.amount, 0);
  const total = subtotal + surchargesTotal;

  const handleSave = async (): Promise<string | undefined> => {
    const activeSurcharges = surcharges.filter((s) => s.enabled).map((s) => ({ name: s.label, amount: s.amount }));
    const id = await saveProposal.mutateAsync({
      id: proposalId, client_name: form.clientName, client_email: form.clientEmail, client_phone: form.clientPhone,
      event_type: form.eventType, event_date: form.eventDate, venue: form.venue, start_time: form.startTime,
      guests: form.guests, color_theme: form.colorTheme, notes: form.notes, personal_note: form.personalNote,
      lead_source: form.leadSource, subtotal, delivery_fee: surcharges.find((s) => s.label === 'Delivery & Setup' && s.enabled)?.amount || 0,
      total, surcharges: activeSurcharges, discounts: [], selected_option_ids: options.map((o) => o.id),
      image_display_mode: 'regular', gallery_layout: 'grid',
      lineItems: lineItems.map((item, i) => ({
        id: item.id, product_id: item.product.id, product_name: item.product.name,
        selected_size: item.selectedSize, selected_color: item.selectedColor,
        quantity: item.quantity, unit_price: item.unitPrice, notes: item.notes, display_order: i,
      })),
    });
    if (id) {
      setProposalId(id);
      saveRevision.mutate({ proposalId: id, snapshot: { form, lineItems: lineItems.map((li) => ({ ...li, product: undefined })), subtotal, surcharges: surcharges.filter((s) => s.enabled), total } });
      setProposalTags.mutate({ proposalId: id, tagIds: selectedTagIds });
    }
    return id;
  };

  const handleSaveAsTemplate = async () => {
    const templateName = form.clientName ? `Template from ${form.clientName}` : `Template ${new Date().toLocaleDateString()}`;
    await saveTemplate.mutateAsync({
      name: templateName, description: form.eventType || '',
      default_personal_note: form.personalNote, default_notes: form.notes,
      default_line_items: lineItems.map((item) => ({
        product_id: item.product.id, product_name: item.product.name,
        selected_size: item.selectedSize, selected_color: item.selectedColor,
        quantity: item.quantity, unit_price: item.unitPrice,
      })),
    });
    toast({ title: 'Template saved!', description: `"${templateName}" is now available as a template.` });
  };

  return (
    <div className="flex h-screen flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b bg-card px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="gap-1" onClick={() => router.push('/proposals')}><ArrowLeft className="h-3.5 w-3.5" /> Back</Button>
          <h2 className="text-lg font-bold">{proposalId ? 'Edit' : 'New'} Proposal</h2>
          {templateData && !editId && <span className="text-sm text-muted-foreground">from &quot;{templateData.name}&quot;</span>}
        </div>
        <div className="flex items-center gap-2">
          {revisions.length > 0 && <Badge variant="outline" className="text-xs">v{revisions.length}</Badge>}
          {proposalId && (
            <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={handleSaveAsTemplate} disabled={saveTemplate.isPending}>
              <BookTemplate className="h-3.5 w-3.5" /> Save as Template
            </Button>
          )}
          <Button variant="outline" size="sm" className="gap-1" onClick={handleSave} disabled={saveProposal.isPending}>
            <Save className="h-3.5 w-3.5" /> {saveProposal.isPending ? 'Saving...' : 'Save Draft'}
          </Button>
          <Button size="sm" className="gap-1" disabled={lineItems.length === 0 && options.length === 0}>
            <Send className="h-3.5 w-3.5" /> Approve & Send
          </Button>
        </div>
      </div>

      {/* Main scrollable form */}
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {/* Client Info */}
          <div className="rounded-lg border p-6 space-y-4">
            <h3 className="text-sm font-semibold">Client Information</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>Client Name</Label><Input value={form.clientName} onChange={(e) => handleFormChange({ clientName: e.target.value })} /></div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.clientEmail} onChange={(e) => handleFormChange({ clientEmail: e.target.value })} /></div>
              <div className="space-y-2"><Label>Phone</Label><Input value={form.clientPhone} onChange={(e) => handleFormChange({ clientPhone: e.target.value })} /></div>
              <div className="space-y-2"><Label>Lead Source</Label><Input value={form.leadSource} onChange={(e) => handleFormChange({ leadSource: e.target.value })} placeholder="e.g. Instagram, Referral" /></div>
            </div>
          </div>

          {/* Event Info */}
          <div className="rounded-lg border p-6 space-y-4">
            <h3 className="text-sm font-semibold">Event Details</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>Event Type</Label><Input value={form.eventType} onChange={(e) => handleFormChange({ eventType: e.target.value })} placeholder="e.g. Birthday, Wedding" /></div>
              <div className="space-y-2"><Label>Event Date</Label><Input type="date" value={form.eventDate} onChange={(e) => handleFormChange({ eventDate: e.target.value })} /></div>
              <div className="space-y-2"><Label>Venue</Label><Input value={form.venue} onChange={(e) => handleFormChange({ venue: e.target.value })} /></div>
              <div className="space-y-2"><Label>Start Time</Label><Input value={form.startTime} onChange={(e) => handleFormChange({ startTime: e.target.value })} placeholder="e.g. 2:00 PM" /></div>
              <div className="space-y-2"><Label>Guests</Label><Input value={form.guests} onChange={(e) => handleFormChange({ guests: e.target.value })} /></div>
              <div className="space-y-2"><Label>Color Theme</Label><Input value={form.colorTheme} onChange={(e) => handleFormChange({ colorTheme: e.target.value })} /></div>
            </div>
          </div>

          {/* Tags */}
          {allTags.length > 0 && (
            <div className="rounded-lg border p-6 space-y-3">
              <h3 className="text-sm font-semibold">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {allTags.map((tag) => (
                  <button key={tag.id} onClick={() => setSelectedTagIds((prev) => prev.includes(tag.id) ? prev.filter((id) => id !== tag.id) : [...prev, tag.id])}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${selectedTagIds.includes(tag.id) ? 'ring-2 ring-offset-1' : 'bg-muted text-muted-foreground'}`}
                    style={selectedTagIds.includes(tag.id) ? { backgroundColor: tag.color + '20', color: tag.color, borderColor: tag.color } : {}}>
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Line Items */}
          <div className="rounded-lg border p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Line Items</h3>
              <span className="text-sm font-mono text-muted-foreground">${lineItemSubtotal.toLocaleString()}</span>
            </div>

            {lineItems.length > 0 && (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Color</TableHead>
                      <TableHead className="text-center">Qty</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lineItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium text-sm">{item.product.name}</TableCell>
                        <TableCell>
                          {item.product.sizes.length > 1 ? (
                            <Select value={item.selectedSize} onValueChange={(val) => {
                              const size = item.product.sizes.find((s) => s.name === val);
                              updateLineItem(item.id, { selectedSize: val, unitPrice: size?.price || item.unitPrice });
                            }}>
                              <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>{item.product.sizes.map((s) => <SelectItem key={s.name} value={s.name}>{s.name} - ${s.price}</SelectItem>)}</SelectContent>
                            </Select>
                          ) : <span className="text-xs text-muted-foreground">{item.selectedSize}</span>}
                        </TableCell>
                        <TableCell>
                          {item.product.color_presets.length > 0 ? (
                            <Select value={item.selectedColor} onValueChange={(val) => updateLineItem(item.id, { selectedColor: val })}>
                              <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {item.product.color_presets.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                <SelectItem value="Custom">Custom</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : <span className="text-xs text-muted-foreground">{item.selectedColor}</span>}
                        </TableCell>
                        <TableCell className="text-center">
                          <Input type="number" min={1} value={item.quantity} onChange={(e) => updateLineItem(item.id, { quantity: parseInt(e.target.value) || 1 })} className="h-8 w-16 text-center text-xs" />
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">${item.unitPrice}</TableCell>
                        <TableCell className="text-right font-mono text-sm">${(item.unitPrice * item.quantity).toLocaleString()}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => removeLineItem(item.id)} className="h-7 text-destructive"><Trash2 className="h-3 w-3" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <Select onValueChange={handleAddProduct}>
              <SelectTrigger className="text-sm"><SelectValue placeholder="Add a product..." /></SelectTrigger>
              <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} - from ${p.base_price}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          {/* Options */}
          <div className="rounded-lg border p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Options (Packages)</h3>
              <span className="text-sm font-mono text-muted-foreground">${optionsSubtotal.toLocaleString()}</span>
            </div>

            {options.length > 0 && (
              <div className="space-y-2">
                {options.map((opt) => (
                  <div key={opt.id} className="flex items-center justify-between rounded-lg border bg-card p-3">
                    <div>
                      <p className="text-sm font-medium">{opt.name}</p>
                      <p className="text-xs font-mono text-muted-foreground">${opt.display_price.toLocaleString()}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => removeOption(opt.id)} className="h-7 text-destructive"><Trash2 className="h-3 w-3" /></Button>
                  </div>
                ))}
              </div>
            )}

            {allOptions.filter((o) => !options.some((oo) => oo.id === o.id)).length > 0 && (
              <Select onValueChange={handleAddOption}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="Attach an option..." /></SelectTrigger>
                <SelectContent>
                  {allOptions.filter((o) => !options.some((oo) => oo.id === o.id)).map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.name} - ${o.display_price.toLocaleString()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Personal Note */}
          <div className="rounded-lg border p-6 space-y-4">
            <h3 className="text-sm font-semibold">Personal Note</h3>
            <Textarea value={form.personalNote} onChange={(e) => handleFormChange({ personalNote: e.target.value })} rows={3} placeholder="Personal message to the client..." />
          </div>

          {/* Notes */}
          <div className="rounded-lg border p-6 space-y-4">
            <h3 className="text-sm font-semibold">Internal Notes</h3>
            <Textarea value={form.notes} onChange={(e) => handleFormChange({ notes: e.target.value })} rows={2} placeholder="Notes visible only to you..." />
          </div>

          {/* Surcharges & Totals */}
          <div className="rounded-lg border p-6 space-y-4">
            <h3 className="text-sm font-semibold">Surcharges & Fees</h3>
            <div className="space-y-2">
              {surcharges.map((s, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-muted p-3">
                  <div className="flex items-center gap-3">
                    <Switch checked={s.enabled} onCheckedChange={(checked) => setSurcharges((prev) => prev.map((x, xi) => (xi === i ? { ...x, enabled: checked } : x)))} />
                    <span className="text-sm">{s.label}</span>
                  </div>
                  <Input type="number" min={0} value={s.amount} onChange={(e) => setSurcharges((prev) => prev.map((x, xi) => (xi === i ? { ...x, amount: parseFloat(e.target.value) || 0 } : x)))} className="h-8 w-24 text-right font-mono text-sm" />
                </div>
              ))}
            </div>

            <hr />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Line items subtotal</span>
                <span className="font-mono">${lineItemSubtotal.toLocaleString()}</span>
              </div>
              {optionsSubtotal > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Options subtotal</span>
                  <span className="font-mono">${optionsSubtotal.toLocaleString()}</span>
                </div>
              )}
              {surchargesTotal > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Surcharges</span>
                  <span className="font-mono">+${surchargesTotal.toLocaleString()}</span>
                </div>
              )}
              <hr />
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="font-mono text-primary">${total.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
