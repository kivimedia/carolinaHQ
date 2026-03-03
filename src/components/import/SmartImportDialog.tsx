'use client';

import { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, Check, AlertCircle, ArrowRight, ArrowLeft, X } from 'lucide-react';
import { InventoryButton } from '@/components/inventory-ui/InventoryButton';
import { useInventoryImport } from '@/hooks/inventory/useInventoryImport';
import { useInventoryCategories } from '@/hooks/inventory/useInventoryCategories';
import { parseSpreadsheetFile, isSpreadsheetFile, ACCEPTED_IMPORT_TYPES } from '@/lib/import/parseSpreadsheet';
import { autoMapColumns, getMissingRequired, TARGET_FIELDS, type ColumnMapping } from '@/lib/import/columnMapping';

type Step = 'upload' | 'mapping' | 'preview' | 'importing' | 'done';

interface SmartImportDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function SmartImportDialog({ open, onClose }: SmartImportDialogProps) {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);

  const { data: categories } = useInventoryCategories();
  const importMutation = useInventoryImport();

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    if (!isSpreadsheetFile(selectedFile)) return;
    setFile(selectedFile);

    try {
      const parsed = await parseSpreadsheetFile(selectedFile);
      setHeaders(parsed.headers);
      setRows(parsed.rows);
      const autoMapped = autoMapColumns(parsed.headers);
      setMappings(autoMapped);
      setStep('mapping');
    } catch {
      // parse error handled silently
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFileSelect(dropped);
  }, [handleFileSelect]);

  const updateMapping = (index: number, targetField: string) => {
    setMappings((prev) => prev.map((m, i) => i === index ? { ...m, targetField, confidence: targetField ? 'exact' as const : 'unmapped' as const } : m));
  };

  const handleImport = async () => {
    setStep('importing');
    try {
      const result = await importMutation.mutateAsync({ rows, mappings, categoryId: categoryId || undefined });
      setImportResult(result);
      setStep('done');
    } catch {
      setStep('preview');
    }
  };

  const reset = () => {
    setStep('upload');
    setFile(null);
    setHeaders([]);
    setRows([]);
    setMappings([]);
    setCategoryId('');
    setImportResult(null);
  };

  if (!open) return null;

  const missingRequired = getMissingRequired(mappings);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-cb-pink-100">
          <h2 className="text-lg font-bold text-navy">Import Inventory</h2>
          <button onClick={() => { reset(); onClose(); }} className="rounded-lg p-1 hover:bg-gray-100">
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-3 px-6 py-3 bg-cb-pink-50/50">
          {['Upload', 'Map Columns', 'Preview', 'Import'].map((label, i) => {
            const stepIndex = ['upload', 'mapping', 'preview', 'importing'].indexOf(step);
            const isDone = step === 'done' || i < stepIndex;
            const isCurrent = (step === 'importing' || step === 'done') ? i === 3 : i === stepIndex;
            return (
              <div key={label} className="flex items-center gap-2">
                <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                  isDone ? 'bg-green-500 text-white' : isCurrent ? 'bg-cb-pink text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  {isDone ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </div>
                <span className="text-xs font-medium text-gray-600 hidden sm:inline">{label}</span>
                {i < 3 && <div className="w-6 h-0.5 bg-gray-200" />}
              </div>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto px-6 py-5">
          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="border-2 border-dashed border-cb-pink-200 rounded-2xl p-12 text-center hover:border-cb-pink transition-colors"
            >
              <FileSpreadsheet className="mx-auto h-12 w-12 text-cb-pink/40 mb-4" />
              <p className="text-sm text-gray-600 mb-3">Drag & drop a spreadsheet file, or click to browse</p>
              <label className="cursor-pointer">
                <InventoryButton asChild>
                  <span><Upload className="h-4 w-4 mr-1" /> Choose File</span>
                </InventoryButton>
                <input type="file" accept={ACCEPTED_IMPORT_TYPES} onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelect(f);
                }} className="hidden" />
              </label>
              <p className="text-xs text-gray-400 mt-3">Supports .csv, .xlsx, .xls</p>
            </div>
          )}

          {/* Step 2: Column Mapping */}
          {step === 'mapping' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                File: <strong>{file?.name}</strong> - {rows.length} rows detected
              </p>

              {/* Category selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assign to Category (optional)</label>
                <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full rounded-xl border border-cb-pink-100 px-4 py-2.5 text-sm">
                  <option value="">No category</option>
                  {(categories || []).map((cat: any) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              {/* Mappings */}
              <div className="border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-cb-pink-50">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-navy">CSV Column</th>
                      <th className="text-left px-3 py-2 font-medium text-navy">Maps To</th>
                      <th className="text-center px-3 py-2 font-medium text-navy w-24">Confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mappings.map((m, i) => (
                      <tr key={m.csvHeader} className="border-t">
                        <td className="px-3 py-2 font-mono text-xs">{m.csvHeader}</td>
                        <td className="px-3 py-2">
                          <select
                            value={m.targetField}
                            onChange={(e) => updateMapping(i, e.target.value)}
                            className="w-full rounded-lg border border-gray-200 px-2 py-1 text-sm"
                          >
                            <option value="">(skip)</option>
                            {TARGET_FIELDS.map((f) => (
                              <option key={f} value={f}>{f}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            m.confidence === 'exact' ? 'bg-green-50 text-green-700' :
                            m.confidence === 'alias' ? 'bg-blue-50 text-blue-700' :
                            m.confidence === 'suggested' ? 'bg-amber-50 text-amber-700' :
                            'bg-gray-100 text-gray-500'
                          }`}>
                            {m.confidence}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {missingRequired.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl p-3">
                  <AlertCircle className="h-4 w-4" />
                  Missing required: {missingRequired.join(', ')}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Preview */}
          {step === 'preview' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Ready to import <strong>{rows.length}</strong> items
                {categoryId && categories ? ` into "${(categories as any[]).find((c: any) => c.id === categoryId)?.name}"` : ''}
              </p>

              <div className="border rounded-xl overflow-hidden max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-cb-pink-50 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium w-10">#</th>
                      {mappings.filter(m => m.targetField).map((m) => (
                        <th key={m.targetField} className="text-left px-3 py-2 font-medium">{m.targetField}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 20).map((row, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-1.5 text-gray-400">{i + 1}</td>
                        {mappings.filter(m => m.targetField).map((m) => (
                          <td key={m.targetField} className="px-3 py-1.5 truncate max-w-[200px]">
                            {row[m.csvHeader] || '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rows.length > 20 && (
                <p className="text-xs text-gray-400 text-center">Showing first 20 of {rows.length} rows</p>
              )}
            </div>
          )}

          {/* Step 4: Importing */}
          {step === 'importing' && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cb-pink mx-auto mb-4" />
              <p className="text-sm text-gray-600">Importing {rows.length} items...</p>
            </div>
          )}

          {/* Step 5: Done */}
          {step === 'done' && importResult && (
            <div className="text-center py-8">
              <Check className="mx-auto h-12 w-12 text-green-500 mb-4" />
              <h3 className="text-lg font-bold text-navy mb-2">Import Complete</h3>
              <div className="space-y-1 text-sm">
                <p className="text-green-600">Imported: {importResult.imported} items</p>
                {importResult.skipped > 0 && <p className="text-gray-500">Skipped: {importResult.skipped} rows (missing name)</p>}
                {importResult.errors.length > 0 && (
                  <div className="mt-3 text-left max-h-40 overflow-y-auto bg-red-50 rounded-xl p-3">
                    <p className="text-red-600 font-medium mb-1">{importResult.errors.length} errors:</p>
                    {importResult.errors.map((err, i) => (
                      <p key={i} className="text-xs text-red-500">{err}</p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-cb-pink-100">
          <div>
            {step === 'mapping' && (
              <InventoryButton inventoryVariant="ghost" onClick={() => { setStep('upload'); setFile(null); }}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </InventoryButton>
            )}
            {step === 'preview' && (
              <InventoryButton inventoryVariant="ghost" onClick={() => setStep('mapping')}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </InventoryButton>
            )}
          </div>
          <div className="flex gap-2">
            {step === 'done' && (
              <InventoryButton onClick={() => { reset(); onClose(); }}>Done</InventoryButton>
            )}
            {step === 'mapping' && (
              <InventoryButton onClick={() => setStep('preview')} disabled={missingRequired.length > 0}>
                Preview <ArrowRight className="h-4 w-4 ml-1" />
              </InventoryButton>
            )}
            {step === 'preview' && (
              <InventoryButton onClick={handleImport}>
                Import {rows.length} Items <ArrowRight className="h-4 w-4 ml-1" />
              </InventoryButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
