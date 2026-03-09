'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui-shadcn/badge";
import { Button } from "@/components/ui-shadcn/button";
import { Sparkles, Edit, Copy, Trash2, Play, Loader2 } from "lucide-react";
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
import {
  useTemplates,
  useDeleteTemplate,
  useDuplicateTemplate,
  useSaveTemplate,
} from "@/hooks/fun/use-templates";

export default function FunTemplates() {
  const router = useRouter();
  const { data: templates = [], isLoading } = useTemplates();
  const deleteTemplate = useDeleteTemplate();
  const duplicateTemplate = useDuplicateTemplate();
  const saveTemplate = useSaveTemplate();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleCreateCustom = async () => {
    const id = await saveTemplate.mutateAsync({
      name: "New Template",
      description: "",
      event_types: [],
      colors: ["#ec4899", "#1e293b"],
      is_default: false,
      default_line_items: [],
      default_personal_note: "",
      default_notes: "",
      default_delivery_fee: 0,
      default_surcharges: [],
      default_discounts: [],
    });
    router.push(`/templates/${id}/edit`);
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Proposal Templates</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose and customize how your proposals look
          </p>
        </div>
        <Button
          variant="outline"
          className="gap-2"
          onClick={handleCreateCustom}
          disabled={saveTemplate.isPending}
        >
          <Sparkles className="h-4 w-4" /> Create Custom
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {templates.map((template, i) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass-card overflow-hidden"
            >
              <div className="flex h-3">
                {template.colors.map((color, ci) => (
                  <div key={ci} className="flex-1" style={{ backgroundColor: color }} />
                ))}
              </div>

              <div className="p-6">
                <div className="flex items-start justify-between">
                  <h3 className="font-display text-lg font-semibold text-foreground">
                    {template.name}
                  </h3>
                  {template.is_default && (
                    <Badge className="bg-primary text-primary-foreground">Default</Badge>
                  )}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {template.description}
                </p>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {template.event_types.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-blush px-2.5 py-1 text-[10px] font-medium text-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="mt-4 flex gap-2">
                  {template.colors.map((color, ci) => (
                    <div
                      key={ci}
                      className="h-8 w-8 rounded-full ring-2 ring-border"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>

                {template.default_line_items.length > 0 && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    {template.default_line_items.length} default product
                    {template.default_line_items.length !== 1 ? "s" : ""}
                  </p>
                )}

                <div className="mt-5 flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 gap-1.5 text-xs"
                    onClick={() => router.push(`/proposals/new?template=${template.id}`)}
                  >
                    <Play className="h-3 w-3" /> Use
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => router.push(`/templates/${template.id}/edit`)}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => duplicateTemplate.mutate(template)}
                    disabled={duplicateTemplate.isPending}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs text-destructive hover:text-destructive"
                    onClick={() => setDeleteId(template.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Existing proposals using this template won&apos;t be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) deleteTemplate.mutate(deleteId);
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
