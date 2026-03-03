'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight, ChevronDown, Folder, FolderOpen, X } from 'lucide-react';
import type { CategoryTreeNode } from '@/hooks/inventory/useInventoryCategories';

interface CategorySidePanelProps {
  categories: CategoryTreeNode[];
  selectedCategory: string | null;
  onSelectCategory: (id: string | null) => void;
  onClose: () => void;
}

export function CategorySidePanel({
  categories,
  selectedCategory,
  onSelectCategory,
  onClose,
}: CategorySidePanelProps) {
  return (
    <div className="w-56 flex-shrink-0 bg-white rounded-2xl border border-cb-pink-100 p-3">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-navy">Categories</h3>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-cb-pink-50 text-muted-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <button
        onClick={() => onSelectCategory(null)}
        className={cn(
          'w-full text-left px-2 py-1.5 rounded-lg text-sm transition-colors mb-1',
          selectedCategory === null
            ? 'bg-cb-pink-100 text-cb-pink-dark font-medium'
            : 'text-muted-foreground hover:bg-cb-pink-50'
        )}
      >
        All Items
      </button>

      <div className="space-y-0.5">
        {categories.map((cat) => (
          <CategoryNode
            key={cat.id}
            category={cat}
            selectedCategory={selectedCategory}
            onSelectCategory={onSelectCategory}
            depth={0}
          />
        ))}
      </div>
    </div>
  );
}

function CategoryNode({
  category,
  selectedCategory,
  onSelectCategory,
  depth,
}: {
  category: CategoryTreeNode;
  selectedCategory: string | null;
  onSelectCategory: (id: string | null) => void;
  depth: number;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = category.children.length > 0;
  const isSelected = selectedCategory === category.id;

  return (
    <div>
      <button
        onClick={() => onSelectCategory(category.id)}
        className={cn(
          'w-full text-left flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm transition-colors',
          isSelected
            ? 'bg-cb-pink-100 text-cb-pink-dark font-medium'
            : 'text-navy hover:bg-cb-pink-50'
        )}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
      >
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="p-0.5 rounded hover:bg-cb-pink-200/50"
          >
            {expanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
        )}
        {!hasChildren && <span className="w-4" />}
        {category.icon ? (
          <span className="text-sm">{category.icon}</span>
        ) : isSelected ? (
          <FolderOpen className="h-3.5 w-3.5 text-cb-pink" />
        ) : (
          <Folder className="h-3.5 w-3.5 text-muted-foreground" />
        )}
        <span className="truncate">{category.name}</span>
      </button>

      {hasChildren && expanded && (
        <div>
          {category.children.map((child) => (
            <CategoryNode
              key={child.id}
              category={child}
              selectedCategory={selectedCategory}
              onSelectCategory={onSelectCategory}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
