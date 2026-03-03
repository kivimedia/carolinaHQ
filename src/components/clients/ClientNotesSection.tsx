'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { MessageSquare, Send, Pencil, Trash2, X, Check, User } from 'lucide-react';
import { Textarea } from '@/components/ui-shadcn/textarea';
import { Skeleton } from '@/components/ui-shadcn/skeleton';
import { InventoryButton } from '@/components/inventory-ui/InventoryButton';
import {
  useClientNotes,
  useAddClientNote,
  useUpdateClientNote,
  useDeleteClientNote,
  type ClientNote,
} from '@/hooks/inventory/useClientNotes';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

function getInitials(name: string | null | undefined) {
  if (!name) return '?';
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function NoteItem({ note, clientId, currentUserId }: { note: ClientNote; clientId: string; currentUserId: string | null }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(note.content);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const updateNote = useUpdateClientNote();
  const deleteNote = useDeleteClientNote();
  const isOwner = currentUserId === note.user_id;
  const wasEdited = note.updated_at !== note.created_at;

  const handleSave = async () => {
    if (!editContent.trim()) return;
    try {
      await updateNote.mutateAsync({ noteId: note.id, content: editContent.trim(), clientId });
      setIsEditing(false);
      toast.success('Note updated');
    } catch { toast.error('Failed to update note'); }
  };

  const handleDelete = async () => {
    try {
      await deleteNote.mutateAsync({ noteId: note.id, clientId });
      toast.success('Note deleted');
    } catch { toast.error('Failed to delete note'); }
  };

  return (
    <div className="flex gap-3 group">
      <div className="h-8 w-8 rounded-full bg-cb-pink/10 flex items-center justify-center text-xs font-medium text-cb-pink flex-shrink-0">
        {getInitials(note.user_profile?.full_name)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm text-navy">
            {note.user_profile?.full_name || 'Unknown User'}
          </span>
          <span className="text-xs text-muted-foreground">
            {format(new Date(note.created_at), "MMM d, yyyy 'at' h:mm a")}
          </span>
          {wasEdited && <span className="text-xs text-muted-foreground italic">(edited)</span>}
        </div>

        {isEditing ? (
          <div className="mt-2 space-y-2">
            <Textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} className="min-h-[80px] text-sm border-cb-pink-100" autoFocus />
            <div className="flex gap-2">
              <InventoryButton inventoryVariant="primary" className="h-7 px-3 text-xs" onClick={handleSave} disabled={!editContent.trim() || updateNote.isPending}>
                <Check className="h-3.5 w-3.5 mr-1" /> Save
              </InventoryButton>
              <InventoryButton inventoryVariant="ghost" className="h-7 px-3 text-xs" onClick={() => { setEditContent(note.content); setIsEditing(false); }}>
                <X className="h-3.5 w-3.5 mr-1" /> Cancel
              </InventoryButton>
            </div>
          </div>
        ) : (
          <div className="mt-1">
            <p className="text-sm whitespace-pre-wrap">{note.content}</p>
            {isOwner && (
              <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <InventoryButton inventoryVariant="ghost" className="h-7 px-2 text-xs" onClick={() => setIsEditing(true)}>
                  <Pencil className="h-3 w-3 mr-1" /> Edit
                </InventoryButton>
                {confirmDelete ? (
                  <>
                    <InventoryButton inventoryVariant="ghost" className="h-7 px-2 text-xs text-red-600" onClick={handleDelete}>
                      Confirm
                    </InventoryButton>
                    <InventoryButton inventoryVariant="ghost" className="h-7 px-2 text-xs" onClick={() => setConfirmDelete(false)}>
                      Cancel
                    </InventoryButton>
                  </>
                ) : (
                  <InventoryButton inventoryVariant="ghost" className="h-7 px-2 text-xs text-red-600" onClick={() => setConfirmDelete(true)}>
                    <Trash2 className="h-3 w-3 mr-1" /> Delete
                  </InventoryButton>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function ClientNotesSection({ clientId }: { clientId: string }) {
  const [newNote, setNewNote] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const { data: notes, isLoading } = useClientNotes(clientId);
  const addNote = useAddClientNote();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id || null));
  }, []);

  const handleSubmit = async () => {
    if (!newNote.trim()) return;
    try {
      await addNote.mutateAsync({ clientId, content: newNote.trim() });
      setNewNote('');
      toast.success('Note added');
    } catch { toast.error('Failed to add note'); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleSubmit(); }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-cb-pink-100 p-5">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="h-4 w-4" />
          <h3 className="text-base font-semibold text-navy">Notes</h3>
        </div>
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-12 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-cb-pink-100 p-5">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="h-4 w-4 text-navy" />
        <h3 className="text-base font-semibold text-navy">
          Notes
          {notes && notes.length > 0 && <span className="text-xs font-normal text-muted-foreground ml-1">({notes.length})</span>}
        </h3>
      </div>

      {notes && notes.length > 0 ? (
        <div className="max-h-[400px] overflow-auto pr-2 space-y-4 mb-4">
          {notes.map((note) => (
            <NoteItem key={note.id} note={note} clientId={clientId} currentUserId={currentUserId} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-center mb-4">
          <User className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No notes yet. Add one to track interactions.</p>
        </div>
      )}

      <div className="flex gap-2 pt-2 border-t border-cb-pink-100">
        <Textarea
          placeholder="Add a note... (Ctrl+Enter to submit)"
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          onKeyDown={handleKeyDown}
          className="min-h-[60px] text-sm resize-none border-cb-pink-100"
        />
        <InventoryButton
          inventoryVariant="primary"
          className="self-end"
          onClick={handleSubmit}
          disabled={!newNote.trim() || addNote.isPending}
        >
          <Send className="h-4 w-4" />
        </InventoryButton>
      </div>
    </div>
  );
}
