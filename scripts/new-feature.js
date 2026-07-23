#!/usr/bin/env node

/**
 * Scaffold generator for new frontend feature modules
 *
 * Usage: node scripts/new-feature.js <name>
 * Example: node scripts/new-feature.js invoices
 *
 * Generates:
 *   apps/web/src/features/{name}/api/{name}Api.ts
 *   apps/web/src/features/{name}/hooks/use{Name}.ts
 *   apps/web/src/features/{name}/components/{Name}List.tsx
 *   apps/web/src/features/{name}/components/{Name}Form.tsx
 *   apps/web/src/features/{name}/types/index.ts
 *   apps/web/src/features/{name}/index.ts
 */

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Convert kebab-case or plain name to camelCase
 * e.g. "glass-orders" -> "glassOrders"
 */
function toCamelCase(str) {
  return str.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

/**
 * Convert kebab-case or plain name to PascalCase
 * e.g. "glass-orders" -> "GlassOrders"
 */
function toPascalCase(str) {
  return capitalize(toCamelCase(str));
}

/**
 * Singularize a simple English plural (basic heuristic).
 * "invoices" -> "invoice", "orders" -> "order", "deliveries" -> "delivery"
 */
function singularize(str) {
  if (str.endsWith('ies')) return str.slice(0, -3) + 'y';
  if (str.endsWith('ses') || str.endsWith('xes') || str.endsWith('zes')) return str.slice(0, -2);
  if (str.endsWith('s') && !str.endsWith('ss')) return str.slice(0, -1);
  return str;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const rawName = process.argv[2];

if (!rawName) {
  console.error('Usage: node scripts/new-feature.js <name>');
  console.error('Example: node scripts/new-feature.js invoices');
  process.exit(1);
}

// Normalize: lowercase, allow kebab-case
const name = rawName.toLowerCase();                 // e.g. "invoices" or "glass-orders"
const camel = toCamelCase(name);                    // e.g. "glassOrders"
const Pascal = toPascalCase(name);                  // e.g. "GlassOrders"
const singular = singularize(camel);                // e.g. "glassOrder"
const Singular = capitalize(singular);              // e.g. "GlassOrder"

const ROOT = path.resolve(__dirname, '..');
const FEATURE_DIR = path.join(ROOT, 'apps', 'web', 'src', 'features', name);

// Abort if feature directory already exists
if (fs.existsSync(FEATURE_DIR)) {
  console.error(`ABORT: Feature directory already exists: ${FEATURE_DIR}`);
  console.error('Remove it first or choose a different name.');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Directories to create
// ---------------------------------------------------------------------------

const dirs = [
  FEATURE_DIR,
  path.join(FEATURE_DIR, 'api'),
  path.join(FEATURE_DIR, 'hooks'),
  path.join(FEATURE_DIR, 'components'),
  path.join(FEATURE_DIR, 'types'),
];

// ---------------------------------------------------------------------------
// Template: API
// ---------------------------------------------------------------------------

function apiTemplate() {
  return `/**
 * ${Pascal} API - Communication with backend
 */

import { fetchApi } from '@/lib/api-client';
import type { ${Singular}, Create${Singular}Input, Update${Singular}Input } from '../types';

/**
 * Fetch all ${camel}
 */
export async function get${Pascal}(): Promise<${Singular}[]> {
  return fetchApi<${Singular}[]>('/api/${name}');
}

/**
 * Fetch a single ${singular} by ID
 */
export async function get${Singular}(id: number): Promise<${Singular}> {
  return fetchApi<${Singular}>(\`/api/${name}/\${id}\`);
}

/**
 * Create a new ${singular}
 */
export async function create${Singular}(data: Create${Singular}Input): Promise<${Singular}> {
  return fetchApi<${Singular}>('/api/${name}', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Update an existing ${singular}
 */
export async function update${Singular}(
  id: number,
  data: Update${Singular}Input
): Promise<${Singular}> {
  return fetchApi<${Singular}>(\`/api/${name}/\${id}\`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Delete a ${singular}
 */
export async function delete${Singular}(id: number): Promise<void> {
  await fetchApi(\`/api/${name}/\${id}\`, { method: 'DELETE' });
}
`;
}

// ---------------------------------------------------------------------------
// Template: Hooks
// ---------------------------------------------------------------------------

function hooksTemplate() {
  return `/**
 * React Query hooks for ${Pascal}
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { showSuccessToast, showErrorToast, getErrorMessage } from '@/lib/toast-helpers';
import {
  get${Pascal},
  get${Singular},
  create${Singular},
  update${Singular},
  delete${Singular},
} from '../api/${camel}Api';
import type { Create${Singular}Input, Update${Singular}Input } from '../types';

const QUERY_KEY = ['${name}'];

/**
 * Fetch list of all ${camel}
 */
export function use${Pascal}() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: get${Pascal},
  });
}

/**
 * Fetch a single ${singular} by ID
 */
export function use${Singular}(id: number, enabled = true) {
  return useQuery({
    queryKey: [...QUERY_KEY, id],
    queryFn: () => get${Singular}(id),
    enabled: enabled && id > 0,
  });
}

/**
 * Create ${singular} mutation
 */
export function useCreate${Singular}() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Create${Singular}Input) => create${Singular}(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      showSuccessToast('Created', '${Singular} has been created');
    },
    onError: (error: Error) => {
      showErrorToast('Create failed', getErrorMessage(error));
    },
  });
}

/**
 * Update ${singular} mutation
 */
export function useUpdate${Singular}() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Update${Singular}Input }) =>
      update${Singular}(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      showSuccessToast('Updated', '${Singular} has been updated');
    },
    onError: (error: Error) => {
      showErrorToast('Update failed', getErrorMessage(error));
    },
  });
}

/**
 * Delete ${singular} mutation
 */
export function useDelete${Singular}() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: delete${Singular},
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      showSuccessToast('Deleted', '${Singular} has been deleted');
    },
    onError: (error: Error) => {
      showErrorToast('Delete failed', getErrorMessage(error));
    },
  });
}
`;
}

// ---------------------------------------------------------------------------
// Template: List Component
// ---------------------------------------------------------------------------

function listTemplate() {
  return `/**
 * ${Singular} List - Table component
 */

'use client';

import React, { useState, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Trash2, Pencil, Loader2, Plus } from 'lucide-react';
import { use${Pascal}, useDelete${Singular} } from '../hooks/use${Pascal}';
import type { ${Singular} } from '../types';

export function ${Singular}List() {
  const { data: items, isLoading, error } = use${Pascal}();
  const deleteMutation = useDelete${Singular}();

  const [deleteTarget, setDeleteTarget] = useState<${Singular} | null>(null);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  }, [deleteTarget, deleteMutation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">Loading...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <p className="text-red-600">Error loading data: {String(error)}</p>
        </CardContent>
      </Card>
    );
  }

  if (!items || items.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <p className="text-gray-600">No ${camel} found</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>${Pascal}</CardTitle>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="w-40 text-center">Created</TableHead>
                <TableHead className="w-28 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono">{item.id}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell className="text-center text-sm text-gray-500">
                    {new Date(item.createdAt).toLocaleDateString('pl-PL')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" title="Edit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleteTarget(item)}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete ${singular}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The ${singular} will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
`;
}

// ---------------------------------------------------------------------------
// Template: Form Component
// ---------------------------------------------------------------------------

function formTemplate() {
  return `/**
 * ${Singular} Form - Create/Edit form component
 */

'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { useCreate${Singular}, useUpdate${Singular} } from '../hooks/use${Pascal}';
import type { ${Singular} } from '../types';

interface ${Singular}FormProps {
  /** If provided, form is in edit mode */
  ${singular}?: ${Singular} | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ${Singular}Form({ ${singular}, open, onOpenChange }: ${Singular}FormProps) {
  const createMutation = useCreate${Singular}();
  const updateMutation = useUpdate${Singular}();
  const isEditing = !!${singular};
  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = (formData.get('name') as string)?.trim();

    if (!name) return;

    if (isEditing && ${singular}) {
      await updateMutation.mutateAsync({
        id: ${singular}.id,
        data: { name },
      });
    } else {
      await createMutation.mutateAsync({ name });
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit' : 'Create'} ${Singular}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                defaultValue={${singular}?.name || ''}
                placeholder="Enter name..."
                required
                autoFocus
              />
            </div>
            {/* TODO: Add more fields matching your model */}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : isEditing ? (
                'Save'
              ) : (
                'Create'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
`;
}

// ---------------------------------------------------------------------------
// Template: Types
// ---------------------------------------------------------------------------

function typesTemplate() {
  return `/**
 * Types for ${Pascal} feature
 */

export interface ${Singular} {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
  // TODO: Add fields matching your Prisma model
}

export interface Create${Singular}Input {
  name: string;
  // TODO: Add fields matching create schema
}

export interface Update${Singular}Input {
  name?: string;
  // TODO: Add fields matching update schema
}
`;
}

// ---------------------------------------------------------------------------
// Template: Barrel export (index.ts)
// ---------------------------------------------------------------------------

function barrelTemplate() {
  return `/**
 * Feature: ${Pascal}
 */

// Components
export { ${Singular}List } from './components/${Singular}List';
export { ${Singular}Form } from './components/${Singular}Form';

// Hooks
export {
  use${Pascal},
  use${Singular},
  useCreate${Singular},
  useUpdate${Singular},
  useDelete${Singular},
} from './hooks/use${Pascal}';

// API
export {
  get${Pascal},
  get${Singular},
  create${Singular},
  update${Singular},
  delete${Singular},
} from './api/${camel}Api';

// Types
export type { ${Singular}, Create${Singular}Input, Update${Singular}Input } from './types';
`;
}

// ---------------------------------------------------------------------------
// Write files
// ---------------------------------------------------------------------------

// Create directories
dirs.forEach((dir) => fs.mkdirSync(dir, { recursive: true }));

const fileMap = [
  { path: path.join(FEATURE_DIR, 'api', `${camel}Api.ts`),            fn: apiTemplate },
  { path: path.join(FEATURE_DIR, 'hooks', `use${Pascal}.ts`),         fn: hooksTemplate },
  { path: path.join(FEATURE_DIR, 'components', `${Singular}List.tsx`), fn: listTemplate },
  { path: path.join(FEATURE_DIR, 'components', `${Singular}Form.tsx`), fn: formTemplate },
  { path: path.join(FEATURE_DIR, 'types', 'index.ts'),                fn: typesTemplate },
  { path: path.join(FEATURE_DIR, 'index.ts'),                         fn: barrelTemplate },
];

fileMap.forEach(({ path: fp, fn }) => {
  fs.writeFileSync(fp, fn(), 'utf-8');
  console.log(`  Created: ${path.relative(ROOT, fp)}`);
});

// ---------------------------------------------------------------------------
// Post-generation instructions
// ---------------------------------------------------------------------------

console.log(`
===================================================
  Frontend feature scaffold complete for "${name}"
===================================================

Generated structure:
  apps/web/src/features/${name}/
    api/${camel}Api.ts          - fetchApi functions (getAll, getById, create, update, delete)
    hooks/use${Pascal}.ts       - React Query hooks (queries + mutations)
    components/${Singular}List.tsx  - Table list component with delete dialog
    components/${Singular}Form.tsx  - Create/Edit form dialog component
    types/index.ts              - TypeScript interfaces
    index.ts                    - Barrel exports

Manual steps remaining:

1. Update the type interfaces in types/index.ts
   to match your Prisma model / backend response shape.

2. Add a page route, e.g.:
   apps/web/src/app/(dashboard)/${name}/page.tsx

3. Add navigation link to the sidebar/menu if needed.

4. Customize the List and Form components with your
   actual fields (the scaffolds use a generic "name" field).
===================================================
`);
