'use client';

import { useRef } from 'react';
import { Upload, FileText, Trash2, Download, File } from 'lucide-react';
import { InventoryButton } from '@/components/inventory-ui/InventoryButton';
import { Skeleton } from '@/components/ui-shadcn/skeleton';
import { useRentalProjectFiles, useCreateRentalProjectFile, useDeleteRentalProjectFile } from '@/hooks/inventory/useRentalProjectFiles';

interface EventFilesTabProps {
  projectId: string;
}

export function EventFilesTab({ projectId }: EventFilesTabProps) {
  const { data: files, isLoading } = useRentalProjectFiles(projectId);
  const createFile = useCreateRentalProjectFile();
  const deleteFile = useDeleteRentalProjectFile();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await createFile.mutateAsync({ projectId, file });
    if (inputRef.current) inputRef.current.value = '';
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    );
  }

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'contract': return <FileText className="h-5 w-5 text-indigo-500" />;
      case 'invoice': return <FileText className="h-5 w-5 text-blue-500" />;
      case 'quote': return <FileText className="h-5 w-5 text-purple-500" />;
      case 'receipt': return <FileText className="h-5 w-5 text-green-500" />;
      default: return <File className="h-5 w-5 text-gray-400" />;
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-navy">
          Files {files && files.length > 0 && `(${files.length})`}
        </h3>
        <div>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={handleUpload}
          />
          <InventoryButton onClick={() => inputRef.current?.click()} disabled={createFile.isPending} className="text-sm">
            <Upload className="h-4 w-4 mr-1" />
            {createFile.isPending ? 'Uploading...' : 'Upload File'}
          </InventoryButton>
        </div>
      </div>

      {!files || files.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-cb-pink-100 p-12 text-center">
          <FileText className="mx-auto h-10 w-10 text-cb-pink/40" />
          <p className="mt-2 text-sm text-muted-foreground">No files uploaded yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {files.map((file) => (
            <div key={file.id} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-cb-pink-100 hover:bg-cb-pink-50/20 transition-colors">
              {getFileIcon(file.file_type)}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {file.file_type} {file.file_size && `- ${file.file_size}`} - {new Date(file.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-1">
                <a
                  href={file.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg p-1.5 hover:bg-cb-pink-50 text-gray-400 hover:text-gray-600"
                >
                  <Download className="h-4 w-4" />
                </a>
                <button
                  onClick={() => deleteFile.mutate({ id: file.id, projectId, fileUrl: file.file_url })}
                  className="rounded-lg p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
