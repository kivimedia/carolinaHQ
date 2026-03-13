'use client';

import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { Button } from "@/components/ui-shadcn/button";
import { Input } from "@/components/ui-shadcn/input";
import { Textarea } from "@/components/ui-shadcn/textarea";
import { Switch } from "@/components/ui-shadcn/switch";
import { Loader2, Upload, X, Plus, Trash2, DollarSign, Sparkles, Tag } from "lucide-react";
import dynamicIconImports from "lucide-react/dynamicIconImports";
import type { LucideProps } from "lucide-react";
import { toast } from "@/hooks/fun/use-toast";
import { useUserSettings, useSaveUserSettings, type Surcharge } from "@/hooks/fun/use-user-settings";
import { useTags, useCreateTag, useUpdateTag, useDeleteTag, type ProposalTag } from "@/hooks/fun/use-tags";
import { createClient } from "@/lib/supabase/client";

const ICON_OPTIONS = ["tag", "star", "heart", "zap", "crown", "flag", "bookmark", "award", "flame", "diamond", "gift", "sparkles", "circle-dot", "target", "shield"] as const;
const COLOR_OPTIONS = ["#6366f1", "#f43f5e", "#10b981", "#f59e0b", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#64748b"];

function DynamicIcon({ name, ...props }: { name: string } & Omit<LucideProps, 'ref'>) {
  const iconName = name as keyof typeof dynamicIconImports;
  if (!dynamicIconImports[iconName]) {
    const FallbackIcon = lazy(dynamicIconImports["tag"]);
    return <Suspense fallback={<div className="h-4 w-4" />}><FallbackIcon {...props} /></Suspense>;
  }
  const LucideIcon = lazy(dynamicIconImports[iconName]);
  return <Suspense fallback={<div className="h-4 w-4" />}><LucideIcon {...props} /></Suspense>;
}

export default function FunSettings() {
  const supabase = createClient();
  const { data: settings, isLoading } = useUserSettings();
  const saveSettings = useSaveUserSettings();

  const [businessName, setBusinessName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [minimumOrders, setMinimumOrders] = useState<Record<string, number>>({});
  const [surcharges, setSurcharges] = useState<Surcharge[]>([]);
  const [itemLabel, setItemLabel] = useState("designs");
  const [logoUrl, setLogoUrl] = useState("");
  const [urlSlug, setUrlSlug] = useState("");
  const [aiMasterPrompt, setAiMasterPrompt] = useState("");
  const [allowItemRemoval, setAllowItemRemoval] = useState(true);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (settings) {
      setBusinessName(settings.business_name || "");
      setContactName(settings.contact_name || "");
      setEmail(settings.email || "");
      setPhone(settings.phone || "");
      setMinimumOrders(settings.minimum_orders || {});
      setSurcharges(settings.surcharges || []);
      setItemLabel(settings.item_label || "designs");
      setLogoUrl(settings.logo_url || "");
      setUrlSlug((settings as any).url_slug || "");
      setAiMasterPrompt(settings.ai_master_prompt || "");
      setAllowItemRemoval(settings.allow_item_removal !== false);
    }
  }, [settings]);

  const handleSaveBusinessInfo = async () => {
    await saveSettings.mutateAsync({
      business_name: businessName,
      contact_name: contactName,
      email,
      phone,
    });
    toast({ title: "Saved", description: "Business info updated." });
  };

  const handleSaveRules = async () => {
    await saveSettings.mutateAsync({
      minimum_orders: minimumOrders,
      surcharges,
    });
    toast({ title: "Rules saved", description: "Your pricing rules have been updated." });
  };

  const handleLogoUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingLogo(true);
    try {
      const file = files[0];
      const ext = file.name.split(".").pop();
      const path = `logos/${settings?.user_id || "unknown"}/${crypto.randomUUID()}.${ext}`;

      const { error } = await supabase.storage.from("product-images").upload(path, file);
      if (error) throw error;

      const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
      const newUrl = urlData.publicUrl;
      setLogoUrl(newUrl);
      await saveSettings.mutateAsync({ logo_url: newUrl } as any);
      toast({ title: "Logo uploaded", description: "Your business logo has been saved." });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {
    setLogoUrl("");
    await saveSettings.mutateAsync({ logo_url: "" } as any);
    toast({ title: "Logo removed" });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const minimumOrderTypes = Object.keys(minimumOrders);

  return (
    <div className="p-6 lg:p-8">
      <h1 className="mb-8 font-display text-3xl font-bold text-foreground">Settings</h1>

      <div className="max-w-2xl space-y-8">
        {/* Business Logo */}
        <section className="glass-card p-6">
          <h2 className="mb-4 font-display text-lg font-semibold text-foreground">Business Logo</h2>
          <p className="mb-4 text-xs text-muted-foreground">
            This logo appears at the top of your proposals.
          </p>
          <div className="flex items-center gap-4">
            {logoUrl ? (
              <div className="relative group">
                <div className="flex h-20 w-40 items-center justify-center overflow-hidden rounded-lg border bg-background">
                  <img src={logoUrl} alt="Business logo" className="max-h-full max-w-full object-contain" />
                </div>
                <button
                  onClick={handleRemoveLogo}
                  className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <label className="flex h-20 w-40 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary">
                {uploadingLogo ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Upload className="mb-1 h-5 w-5" />
                    <span className="text-xs">Upload logo</span>
                  </>
                )}
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleLogoUpload(e.target.files)}
                />
              </label>
            )}
            {logoUrl && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => logoInputRef.current?.click()}
                disabled={uploadingLogo}
              >
                {uploadingLogo ? "Uploading..." : "Replace"}
              </Button>
            )}
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleLogoUpload(e.target.files)}
            />
          </div>
        </section>

        {/* Business Info */}
        <section className="glass-card p-6">
          <h2 className="mb-4 font-display text-lg font-semibold text-foreground">Business Info</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Business Name</label>
              <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Contact Name</label>
              <Input value={contactName} onChange={(e) => setContactName(e.target.value)} className="text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Email</label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} className="text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Phone</label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="text-sm" />
            </div>
          </div>
          <Button className="mt-4" size="sm" onClick={handleSaveBusinessInfo} disabled={saveSettings.isPending}>
            {saveSettings.isPending ? "Saving..." : "Save Info"}
          </Button>
        </section>

        {/* URL Slug */}
        <section className="glass-card p-6">
          <h2 className="mb-4 font-display text-lg font-semibold text-foreground">Public URL</h2>
          <p className="mb-3 text-xs text-muted-foreground">
            Set a custom URL slug for your public proposal page (e.g. &quot;carolina-balloons&quot;).
          </p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">/p/</span>
            <Input
              value={urlSlug}
              onChange={(e) => setUrlSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              className="max-w-xs text-sm font-mono"
              placeholder="your-business-name"
            />
          </div>
          <Button
            className="mt-4"
            size="sm"
            onClick={async () => {
              await saveSettings.mutateAsync({ url_slug: urlSlug } as any);
              toast({ title: "Saved", description: "URL slug updated." });
            }}
            disabled={saveSettings.isPending}
          >
            {saveSettings.isPending ? "Saving..." : "Save URL"}
          </Button>
        </section>

        {/* Terminology */}
        <section className="glass-card p-6">
          <h2 className="mb-4 font-display text-lg font-semibold text-foreground">Terminology</h2>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              What do you call the items in an option? (e.g. &quot;designs&quot;, &quot;elements&quot;, &quot;products&quot;)
            </label>
            <Input
              value={itemLabel}
              onChange={(e) => setItemLabel(e.target.value)}
              className="max-w-xs text-sm"
              placeholder="designs"
            />
          </div>
          <Button
            className="mt-4"
            size="sm"
            onClick={async () => {
              await saveSettings.mutateAsync({ item_label: itemLabel } as any);
              toast({ title: "Saved", description: "Terminology updated." });
            }}
            disabled={saveSettings.isPending}
          >
            {saveSettings.isPending ? "Saving..." : "Save Terminology"}
          </Button>
        </section>

        {/* Proposal Behavior */}
        <section className="glass-card p-6">
          <h2 className="mb-4 font-display text-lg font-semibold text-foreground">Proposal Behavior</h2>
          <div className="flex items-center justify-between rounded-lg bg-blush p-4">
            <div>
              <p className="text-sm font-medium text-foreground">Allow clients to remove items</p>
              <p className="text-xs text-muted-foreground">
                When enabled, clients can remove individual products before accepting a proposal.
              </p>
            </div>
            <Switch
              checked={allowItemRemoval}
              onCheckedChange={async (checked) => {
                setAllowItemRemoval(checked);
                await saveSettings.mutateAsync({ allow_item_removal: checked } as any);
                toast({ title: "Saved", description: checked ? "Clients can remove items." : "Item removal disabled." });
              }}
            />
          </div>
        </section>

        {/* Proposal Tags */}
        <TagsSettingsSection />

        {/* AI Writing Style */}
        <section className="glass-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg font-semibold text-foreground">AI Writing Style</h2>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            This master prompt controls how AI-generated text sounds across your proposals - personal notes, descriptions, etc.
          </p>
          <Textarea
            value={aiMasterPrompt}
            onChange={(e) => setAiMasterPrompt(e.target.value)}
            placeholder="e.g. Write in a warm, southern-charm style. Use exclamation points sparingly. Keep it professional but friendly. Always mention how excited we are about their event. Sign off with 'Cheers' not 'Best regards'."
            className="text-sm min-h-[120px]"
            rows={5}
          />
          <Button
            className="mt-4"
            size="sm"
            onClick={async () => {
              await saveSettings.mutateAsync({ ai_master_prompt: aiMasterPrompt } as any);
              toast({ title: "Saved", description: "AI writing style updated." });
            }}
            disabled={saveSettings.isPending}
          >
            {saveSettings.isPending ? "Saving..." : "Save AI Style"}
          </Button>
        </section>

        {/* Pricing Rules */}
        <section className="glass-card p-6">
          <h2 className="mb-4 font-display text-lg font-semibold text-foreground">Pricing Rules</h2>
          <div className="space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-medium text-foreground">Minimum Order</h3>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => {
                    const name = `Event Type ${minimumOrderTypes.length + 1}`;
                    setMinimumOrders((prev) => ({ ...prev, [name]: 300 }));
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Rule
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {minimumOrderTypes.map((type) => (
                  <div key={type} className="flex items-center gap-2 rounded-lg bg-blush p-3">
                    <Input
                      value={type}
                      onChange={(e) => {
                        const newName = e.target.value;
                        setMinimumOrders((prev) => {
                          const updated: Record<string, number> = {};
                          for (const [k, v] of Object.entries(prev)) {
                            updated[k === type ? newName : k] = v;
                          }
                          return updated;
                        });
                      }}
                      className="h-7 flex-1 text-xs"
                      placeholder="Event type"
                    />
                    <div className="relative w-20">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                      <Input
                        type="number"
                        value={minimumOrders[type] ?? 300}
                        onChange={(e) =>
                          setMinimumOrders((prev) => ({ ...prev, [type]: parseInt(e.target.value) || 0 }))
                        }
                        className="h-7 pl-6 text-right font-mono text-xs"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      onClick={() =>
                        setMinimumOrders((prev) => {
                          const { [type]: _, ...rest } = prev;
                          return rest;
                        })
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-medium text-foreground">Surcharges</h3>
              <div className="space-y-2">
                {surcharges.map((rule, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg bg-blush p-3">
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={rule.enabled}
                        onCheckedChange={(checked) =>
                          setSurcharges((prev) =>
                            prev.map((s, si) => (si === i ? { ...s, enabled: checked } : s))
                          )
                        }
                      />
                      <Input
                        value={rule.label}
                        onChange={(e) =>
                          setSurcharges((prev) =>
                            prev.map((s, si) => (si === i ? { ...s, label: e.target.value } : s))
                          )
                        }
                        className="h-7 w-40 text-xs"
                        placeholder="Surcharge name"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        value={rule.value}
                        onChange={(e) =>
                          setSurcharges((prev) =>
                            prev.map((s, si) => (si === i ? { ...s, value: e.target.value } : s))
                          )
                        }
                        className="h-7 w-24 text-right font-mono text-xs"
                        placeholder="$50 or +15%"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => setSurcharges((prev) => prev.filter((_, si) => si !== i))}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() =>
                    setSurcharges((prev) => [...prev, { label: "", value: "$0", enabled: true }])
                  }
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Surcharge
                </Button>
              </div>
            </div>
          </div>
          <Button className="mt-4" size="sm" onClick={handleSaveRules} disabled={saveSettings.isPending}>
            {saveSettings.isPending ? "Saving..." : "Save Rules"}
          </Button>
        </section>
      </div>
    </div>
  );
}

function TagsSettingsSection() {
  const { data: tags = [], isLoading } = useTags();
  const createTag = useCreateTag();
  const updateTag = useUpdateTag();
  const deleteTag = useDeleteTag();

  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(COLOR_OPTIONS[0]);
  const [newIcon, setNewIcon] = useState<string>("tag");

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createTag.mutateAsync({ name: newName.trim(), color: newColor, icon: newIcon });
    setNewName("");
    setNewColor(COLOR_OPTIONS[0]);
    setNewIcon("tag");
    toast({ title: "Tag created" });
  };

  return (
    <section className="glass-card p-6">
      <div className="flex items-center gap-2 mb-4">
        <Tag className="h-5 w-5 text-primary" />
        <h2 className="font-display text-lg font-semibold text-foreground">Proposal Tags</h2>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        Create tags to organize and filter proposals on your dashboard.
      </p>

      {/* Existing tags */}
      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : (
        <div className="space-y-2 mb-4">
          {tags.map((tag) => (
            <div key={tag.id} className="flex items-center gap-2 rounded-lg bg-blush p-3">
              <div
                className="flex h-7 w-7 items-center justify-center rounded-md"
                style={{ backgroundColor: tag.color + "20" }}
              >
                <DynamicIcon name={tag.icon} size={14} style={{ color: tag.color }} />
              </div>
              <Input
                value={tag.name}
                onChange={(e) => updateTag.mutate({ id: tag.id, name: e.target.value })}
                className="h-7 flex-1 text-xs"
              />
              {/* Color picker */}
              <div className="flex gap-1">
                {COLOR_OPTIONS.slice(0, 5).map((c) => (
                  <button
                    key={c}
                    onClick={() => updateTag.mutate({ id: tag.id, color: c })}
                    className={`h-5 w-5 rounded-full border-2 transition-all ${tag.color === c ? "border-foreground scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              {/* Icon picker */}
              <select
                value={tag.icon}
                onChange={(e) => updateTag.mutate({ id: tag.id, icon: e.target.value })}
                className="h-7 rounded border bg-background px-1 text-xs"
              >
                {ICON_OPTIONS.map((icon) => (
                  <option key={icon} value={icon}>{icon}</option>
                ))}
              </select>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                onClick={() => {
                  deleteTag.mutate(tag.id);
                  toast({ title: "Tag deleted" });
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          {tags.length === 0 && (
            <p className="text-xs text-muted-foreground py-2">No tags yet. Create one below.</p>
          )}
        </div>
      )}

      {/* Add new tag */}
      <div className="flex items-center gap-2 rounded-lg border border-dashed border-border p-3">
        <div className="flex gap-1">
          {COLOR_OPTIONS.slice(0, 5).map((c) => (
            <button
              key={c}
              onClick={() => setNewColor(c)}
              className={`h-5 w-5 rounded-full border-2 transition-all ${newColor === c ? "border-foreground scale-110" : "border-transparent"}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <select
          value={newIcon}
          onChange={(e) => setNewIcon(e.target.value)}
          className="h-7 rounded border bg-background px-1 text-xs"
        >
          {ICON_OPTIONS.map((icon) => (
            <option key={icon} value={icon}>{icon}</option>
          ))}
        </select>
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New tag name..."
          className="h-7 flex-1 text-xs"
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
        />
        <Button size="sm" className="h-7 gap-1 text-xs" onClick={handleCreate} disabled={createTag.isPending}>
          <Plus className="h-3.5 w-3.5" /> Add
        </Button>
      </div>
    </section>
  );
}
