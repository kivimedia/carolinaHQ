'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui-shadcn/table';

export interface LineItem {
  id: string;
  productId?: string;
  name: string;
  category: string;
  quantity: number;
  unitPrice: number;
  notes: string;
  imageUrl?: string;
}

interface LineItemsTableProps {
  items: LineItem[];
  onChange: (items: LineItem[]) => void;
}

const CATEGORIES = [
  'arch', 'bouquet', 'wall', 'garland', 'marquee_letter',
  'centerpiece', 'column', 'banner', 'other',
];

export default function LineItemsTable({ items, onChange }: LineItemsTableProps) {
  const [editingCell, setEditingCell] = useState<{ rowId: string; field: string } | null>(null);

  const updateItem = (id: string, field: keyof LineItem, value: string | number) => {
    onChange(
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const removeItem = (id: string) => {
    onChange(items.filter((item) => item.id !== id));
  };

  const addBlankRow = () => {
    const newItem: LineItem = {
      id: crypto.randomUUID(),
      name: '',
      category: 'other',
      quantity: 1,
      unitPrice: 0,
      notes: '',
    };
    onChange([...items, newItem]);
    setEditingCell({ rowId: newItem.id, field: 'name' });
  };

  const handleCellClick = (rowId: string, field: string) => {
    setEditingCell({ rowId, field });
  };

  const handleCellBlur = () => {
    setEditingCell(null);
  };

  const isEditing = (rowId: string, field: string) =>
    editingCell?.rowId === rowId && editingCell?.field === field;

  return (
    <div className="border border-cream-dark dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-800">
      <Table>
        <TableHeader>
          <TableRow className="bg-cream/50 dark:bg-slate-900/50">
            <TableHead className="text-xs font-semibold text-navy/60 dark:text-slate-400 w-[30%]">Product</TableHead>
            <TableHead className="text-xs font-semibold text-navy/60 dark:text-slate-400 w-[15%]">Category</TableHead>
            <TableHead className="text-xs font-semibold text-navy/60 dark:text-slate-400 w-[8%] text-center">Qty</TableHead>
            <TableHead className="text-xs font-semibold text-navy/60 dark:text-slate-400 w-[12%] text-right">Unit Price</TableHead>
            <TableHead className="text-xs font-semibold text-navy/60 dark:text-slate-400 w-[12%] text-right">Total</TableHead>
            <TableHead className="text-xs font-semibold text-navy/60 dark:text-slate-400 w-[20%]">Notes</TableHead>
            <TableHead className="w-8" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-xs text-navy/40 dark:text-slate-500 py-6">
                Add products from the sidebar or click "Add Row" below
              </TableCell>
            </TableRow>
          )}
          {items.map((item) => (
            <TableRow key={item.id} className="group">
              {/* Product Name */}
              <TableCell
                className="p-1"
                onClick={() => handleCellClick(item.id, 'name')}
              >
                <div className="flex items-center gap-2">
                  {item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      alt=""
                      className="w-7 h-7 rounded object-cover shrink-0 bg-cream dark:bg-slate-600"
                    />
                  )}
                  {isEditing(item.id, 'name') ? (
                    <input
                      autoFocus
                      type="text"
                      value={item.name}
                      onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                      onBlur={handleCellBlur}
                      onKeyDown={(e) => e.key === 'Enter' && handleCellBlur()}
                      className="w-full px-2 py-1 text-xs rounded border border-cb-pink/40 bg-white dark:bg-slate-700 text-navy dark:text-white focus:outline-none focus:ring-1 focus:ring-cb-pink/40"
                    />
                  ) : (
                    <span className="px-2 py-1 text-xs text-navy dark:text-slate-200 cursor-text block truncate">
                      {item.name || <span className="text-navy/30 dark:text-slate-500 italic">Click to edit</span>}
                    </span>
                  )}
                </div>
              </TableCell>

              {/* Category */}
              <TableCell className="p-1">
                <select
                  value={item.category}
                  onChange={(e) => updateItem(item.id, 'category', e.target.value)}
                  className="w-full px-1 py-1 text-xs rounded border-0 bg-transparent text-navy dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-cb-pink/40 cursor-pointer"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                    </option>
                  ))}
                </select>
              </TableCell>

              {/* Quantity */}
              <TableCell
                className="p-1 text-center"
                onClick={() => handleCellClick(item.id, 'quantity')}
              >
                {isEditing(item.id, 'quantity') ? (
                  <input
                    autoFocus
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => updateItem(item.id, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                    onBlur={handleCellBlur}
                    onKeyDown={(e) => e.key === 'Enter' && handleCellBlur()}
                    className="w-full px-1 py-1 text-xs text-center rounded border border-cb-pink/40 bg-white dark:bg-slate-700 text-navy dark:text-white focus:outline-none focus:ring-1 focus:ring-cb-pink/40"
                  />
                ) : (
                  <span className="text-xs text-navy dark:text-slate-200 cursor-text">{item.quantity}</span>
                )}
              </TableCell>

              {/* Unit Price */}
              <TableCell
                className="p-1 text-right"
                onClick={() => handleCellClick(item.id, 'unitPrice')}
              >
                {isEditing(item.id, 'unitPrice') ? (
                  <input
                    autoFocus
                    type="number"
                    min={0}
                    step={0.01}
                    value={item.unitPrice}
                    onChange={(e) => updateItem(item.id, 'unitPrice', Math.max(0, parseFloat(e.target.value) || 0))}
                    onBlur={handleCellBlur}
                    onKeyDown={(e) => e.key === 'Enter' && handleCellBlur()}
                    className="w-full px-1 py-1 text-xs text-right rounded border border-cb-pink/40 bg-white dark:bg-slate-700 text-navy dark:text-white focus:outline-none focus:ring-1 focus:ring-cb-pink/40"
                  />
                ) : (
                  <span className="text-xs text-navy dark:text-slate-200 cursor-text">
                    ${item.unitPrice.toFixed(2)}
                  </span>
                )}
              </TableCell>

              {/* Total */}
              <TableCell className="p-1 text-right">
                <span className="text-xs font-medium text-navy dark:text-white">
                  ${(item.quantity * item.unitPrice).toFixed(2)}
                </span>
              </TableCell>

              {/* Notes */}
              <TableCell
                className="p-1"
                onClick={() => handleCellClick(item.id, 'notes')}
              >
                {isEditing(item.id, 'notes') ? (
                  <input
                    autoFocus
                    type="text"
                    value={item.notes}
                    onChange={(e) => updateItem(item.id, 'notes', e.target.value)}
                    onBlur={handleCellBlur}
                    onKeyDown={(e) => e.key === 'Enter' && handleCellBlur()}
                    className="w-full px-2 py-1 text-xs rounded border border-cb-pink/40 bg-white dark:bg-slate-700 text-navy dark:text-white focus:outline-none focus:ring-1 focus:ring-cb-pink/40"
                  />
                ) : (
                  <span className="px-2 py-1 text-xs text-navy/50 dark:text-slate-400 cursor-text block truncate">
                    {item.notes || <span className="italic">-</span>}
                  </span>
                )}
              </TableCell>

              {/* Remove */}
              <TableCell className="p-1">
                <button
                  onClick={() => removeItem(item.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-600 transition-all"
                  title="Remove item"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="p-2 border-t border-cream-dark dark:border-slate-700">
        <button
          onClick={addBlankRow}
          className="flex items-center gap-1.5 text-xs text-cb-pink hover:text-cb-pink/80 font-medium transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Row
        </button>
      </div>
    </div>
  );
}
