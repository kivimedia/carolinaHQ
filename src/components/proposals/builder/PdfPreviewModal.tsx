'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui-shadcn/dialog';
import { generateDocumentPdfSync } from '@/lib/inventory-pdf/generateDocumentPdf';
import type { GenerateDocumentOptions } from '@/lib/inventory-pdf/types';

interface PdfPreviewModalProps {
  open: boolean;
  onClose: () => void;
  options: GenerateDocumentOptions | null;
}

export default function PdfPreviewModal({ open, onClose, options }: PdfPreviewModalProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !options) {
      setBlobUrl(null);
      return;
    }

    try {
      const doc = generateDocumentPdfSync(options);
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      setBlobUrl(url);

      return () => URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF generation error:', err);
    }
  }, [open, options]);

  const handleDownload = () => {
    if (!options) return;
    try {
      const doc = generateDocumentPdfSync(options);
      const fileName = `${(options.project.name || 'Proposal').replace(/[^a-zA-Z0-9]/g, '_')}_proposal.pdf`;
      doc.save(fileName);
    } catch (err) {
      console.error('PDF download error:', err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col bg-white dark:bg-slate-800 border-cream-dark dark:border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-navy dark:text-white">Proposal Preview</DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 rounded-md overflow-hidden border border-cream-dark dark:border-slate-700 bg-gray-100 dark:bg-slate-900">
          {blobUrl ? (
            <iframe
              src={blobUrl}
              className="w-full h-full"
              title="Proposal PDF Preview"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-navy/40 dark:text-slate-500">
              Generating PDF...
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-md border border-cream-dark dark:border-slate-600 text-navy dark:text-white hover:bg-cream dark:hover:bg-slate-700 transition-colors"
          >
            Close
          </button>
          <button
            onClick={handleDownload}
            className="px-4 py-2 text-xs font-medium rounded-md bg-cb-pink text-white hover:bg-cb-pink/90 transition-colors"
          >
            Download PDF
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
