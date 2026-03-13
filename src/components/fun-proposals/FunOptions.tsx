'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui-shadcn/badge";
import { Button } from "@/components/ui-shadcn/button";
import { Package, Edit, Trash2, Plus, Loader2, Copy } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui-shadcn/alert-dialog";
import { useOptions, useDeleteOption, useSaveOption, useDuplicateOption } from "@/hooks/fun/use-options";
import { useUserSettings } from "@/hooks/fun/use-user-settings";

export default function FunOptions() {
  const router = useRouter();
  const { data: options = [], isLoading, isError } = useOptions();
  const { data: settings } = useUserSettings();
  const deleteOption = useDeleteOption();
  const saveOption = useSaveOption();
  const duplicateOption = useDuplicateOption();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const itemLabel = settings?.item_label || "designs";

  const handleCreate = async () => {
    const id = await saveOption.mutateAsync({
      name: "New Option",
      description: "",
      display_price: 0,
      items: [],
    });
    if (id) router.push(`/options/${id}/edit`);
  };

  const handleDuplicate = async (optId: string) => {
    const newId = await duplicateOption.mutateAsync(optId);
    if (newId) router.push(`/options/${newId}/edit`);
  };

  return (
    <div className="flex-1 overflow-auto p-6 lg:p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Options</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create packages of {itemLabel} with a bundled price. Attach them to templates for client-facing proposals.
          </p>
        </div>
        <Button className="gap-2" onClick={handleCreate} disabled={saveOption.isPending}>
          <Plus className="h-4 w-4" /> New Option
        </Button>
      </div>

      {isLoading && !isError ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : isError ? (
        <div className="rounded-xl border-2 border-dashed border-destructive/30 p-12 text-center">
          <p className="text-sm text-destructive">Failed to load options. Please refresh the page.</p>
        </div>
      ) : options.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border p-12 text-center">
          <Package className="mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No options yet. Create your first package.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {options.map((opt, i) => (
            <motion.div
              key={opt.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-card p-5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-display text-lg font-semibold text-foreground">{opt.name}</h3>
                  {opt.description && (
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{opt.description}</p>
                  )}
                </div>
                {!opt.is_active && <Badge variant="outline" className="text-xs">Inactive</Badge>}
              </div>

              <div className="mt-3 space-y-1">
                <p className="text-xs text-muted-foreground">
                  {opt.items.length} {itemLabel}
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-xl font-bold text-foreground">
                    ${opt.display_price.toLocaleString()}
                  </span>
                  {opt.display_price !== opt.inner_total && (
                    <span className="font-mono text-xs text-muted-foreground line-through">
                      ${opt.inner_total.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>

              {/* Product names preview */}
              {opt.items.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {opt.items.slice(0, 4).map((item) => (
                    <span
                      key={item.id}
                      className="rounded-full bg-blush px-2 py-0.5 text-[10px] font-medium text-foreground"
                    >
                      {item.product_name}
                    </span>
                  ))}
                  {opt.items.length > 4 && (
                    <span className="text-[10px] text-muted-foreground">+{opt.items.length - 4} more</span>
                  )}
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1.5 text-xs"
                  onClick={() => router.push(`/options/${opt.id}/edit`)}
                >
                  <Edit className="h-3 w-3" /> Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => handleDuplicate(opt.id)}
                  disabled={duplicateOption.isPending}
                >
                  <Copy className="h-3 w-3" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs text-destructive hover:text-destructive"
                  onClick={() => setDeleteId(opt.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Option?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the option and its {itemLabel}. Templates using it will be unaffected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) deleteOption.mutate(deleteId);
                setDeleteId(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
