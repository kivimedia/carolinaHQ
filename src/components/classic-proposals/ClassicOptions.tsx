'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Loader2, Trash2, Pencil, Copy, Package } from 'lucide-react';
import { Button } from '@/components/ui-shadcn/button';
import { Badge } from '@/components/ui-shadcn/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui-shadcn/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui-shadcn/alert-dialog';
import { useOptions, useDeleteOption, useSaveOption, useDuplicateOption } from '@/hooks/fun/use-options';
import { useUserSettings } from '@/hooks/fun/use-user-settings';

export default function ClassicOptions() {
  const router = useRouter();
  const { data: options = [], isLoading } = useOptions();
  const { data: settings } = useUserSettings();
  const deleteOption = useDeleteOption();
  const saveOption = useSaveOption();
  const duplicateOption = useDuplicateOption();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const itemLabel = settings?.item_label || 'designs';

  const handleCreate = async () => {
    const id = await saveOption.mutateAsync({ name: 'New Option', description: '', display_price: 0, items: [] });
    if (id) router.push(`/proposals/options/${id}/edit`);
  };

  const handleDuplicate = async (optId: string) => {
    const newId = await duplicateOption.mutateAsync(optId);
    if (newId) router.push(`/proposals/options/${newId}/edit`);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Options</h2>
          <p className="text-sm text-muted-foreground">Create packages of {itemLabel} with bundled pricing.</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={handleCreate} disabled={saveOption.isPending}>
          <Plus className="h-3.5 w-3.5" /> New Option
        </Button>
      </div>

      {options.length === 0 ? (
        <div className="flex flex-col items-center rounded-lg border-2 border-dashed p-12 text-center">
          <Package className="mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No options yet. Create your first package.</p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-center"># Items</TableHead>
                <TableHead className="text-right">Display Price</TableHead>
                <TableHead className="text-right">Inner Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {options.map((opt) => (
                <TableRow key={opt.id}>
                  <TableCell className="font-medium">{opt.name}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">{opt.description || '-'}</TableCell>
                  <TableCell className="text-center">{opt.items.length}</TableCell>
                  <TableCell className="text-right font-mono">${opt.display_price.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">${opt.inner_total.toLocaleString()}</TableCell>
                  <TableCell>
                    {opt.is_active ? (
                      <Badge variant="outline" className="text-xs text-emerald-600">Active</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" className="h-7" onClick={() => router.push(`/proposals/options/${opt.id}/edit`)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7" onClick={() => handleDuplicate(opt.id)} disabled={duplicateOption.isPending}>
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 text-destructive" onClick={() => setDeleteId(opt.id)}>
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
            <AlertDialogTitle>Delete Option?</AlertDialogTitle>
            <AlertDialogDescription>This will remove the option and its {itemLabel}. Templates using it won&apos;t be affected.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => { if (deleteId) deleteOption.mutate(deleteId); setDeleteId(null); }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
