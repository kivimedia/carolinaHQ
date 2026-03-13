'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Loader2, Trash2, Pencil, Copy, Play, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui-shadcn/button';
import { Badge } from '@/components/ui-shadcn/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui-shadcn/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui-shadcn/alert-dialog';
import { useTemplates, useDeleteTemplate, useDuplicateTemplate, useSaveTemplate } from '@/hooks/fun/use-templates';

export default function ClassicTemplates() {
  const router = useRouter();
  const { data: templates = [], isLoading } = useTemplates();
  const deleteTemplate = useDeleteTemplate();
  const duplicateTemplate = useDuplicateTemplate();
  const saveTemplate = useSaveTemplate();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleCreate = async () => {
    const id = await saveTemplate.mutateAsync({
      name: 'New Template', description: '', event_types: [], colors: ['#ec4899', '#1e293b'],
      is_default: false, default_line_items: [], default_personal_note: '', default_notes: '',
      default_delivery_fee: 0, default_surcharges: [], default_discounts: [],
    });
    router.push(`/proposals/templates/${id}/edit`);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="flex-1 overflow-auto p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Proposal Templates</h2>
          <p className="text-sm text-muted-foreground">Pre-built templates for quick proposal creation.</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={handleCreate} disabled={saveTemplate.isPending}>
          <Sparkles className="h-3.5 w-3.5" /> Create Custom
        </Button>
      </div>

      {templates.length === 0 ? (
        <div className="flex flex-col items-center rounded-lg border-2 border-dashed p-12 text-center">
          <p className="text-sm text-muted-foreground">No templates yet.</p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Colors</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Event Types</TableHead>
                <TableHead className="text-center"># Products</TableHead>
                <TableHead className="text-center"># Options</TableHead>
                <TableHead>Default</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <div className="flex gap-1">
                      {t.colors.map((c, i) => (
                        <div key={i} className="h-5 w-5 rounded-full border" style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {t.event_types.map((et) => (
                        <Badge key={et} variant="outline" className="text-[10px]">{et}</Badge>
                      ))}
                      {t.event_types.length === 0 && <span className="text-xs text-muted-foreground">-</span>}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">{t.default_line_items.length}</TableCell>
                  <TableCell className="text-center">{t.options.length}</TableCell>
                  <TableCell>
                    {t.is_default && <Badge className="text-xs">Default</Badge>}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => router.push(`/proposals/new?template=${t.id}`)}>
                        <Play className="h-3 w-3" /> Use
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7" onClick={() => router.push(`/proposals/templates/${t.id}/edit`)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7" onClick={() => duplicateTemplate.mutate(t)} disabled={duplicateTemplate.isPending}>
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 text-destructive" onClick={() => setDeleteId(t.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template?</AlertDialogTitle>
            <AlertDialogDescription>Existing proposals using this template won&apos;t be affected.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => { if (deleteId) deleteTemplate.mutate(deleteId); setDeleteId(null); }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
