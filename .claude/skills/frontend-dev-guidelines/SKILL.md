---
name: frontend-dev-guidelines
description: Frontend development guidelines for React/TypeScript applications with TailwindCSS and Shadcn/ui. Modern patterns including Suspense, lazy loading, React Query, file organization with features directory, TailwindCSS styling, responsive design, performance optimization, and TypeScript best practices. Use when creating components, pages, features, fetching data, styling, routing, or working with frontend code.
---

# Frontend Development Guidelines

## Purpose

Comprehensive guide for modern React development with TailwindCSS, emphasizing Suspense-based data fetching, lazy loading, proper file organization, and performance optimization.

## When to Use This Skill

- Creating new components or pages
- Building new features
- Fetching data with TanStack Query
- Setting up routing
- Styling components with TailwindCSS
- Performance optimization
- Organizing frontend code
- TypeScript best practices
- Working with forms and tables

---

## Quick Start

### New Component Checklist

Creating a component? Follow this checklist:

- [ ] Use `React.FC<Props>` pattern with TypeScript
- [ ] Lazy load if heavy component: `React.lazy(() => import())`
- [ ] Wrap in loading state boundary for data fetching
- [ ] Use `useSuspenseQuery` or `useQuery` for data
- [ ] Import aliases: `@/`
- [ ] Styles: TailwindCSS classes + optional separate `.css`
- [ ] Use `useCallback` for event handlers passed to children
- [ ] Default export at bottom
- [ ] No early returns with loading spinners
- [ ] Use toast for user notifications (Shadcn/ui Toast)

### New Feature Checklist

Creating a feature? Set up this structure:

- [ ] Create `features/{feature-name}/` directory
- [ ] Create subdirectories: `api/`, `components/`, `hooks/`, `helpers/`, `types/`
- [ ] Create API service file: `api/{feature}Api.ts`
- [ ] Set up TypeScript types in `types/`
- [ ] Create route in `app/{feature-name}/`
- [ ] Lazy load feature components
- [ ] Use proper error boundaries
- [ ] Export public API from feature `index.ts`

---

## Import Aliases Quick Reference

| Alias | Resolves To | Example |
|-------|-------------|---------|
| `@/` | `src/` | `import { apiClient } from '@/lib/api'` |

---

## Common Imports Cheatsheet

```typescript
// React & Lazy Loading
import React, { useState, useCallback, useMemo } from 'react';
const HeavyComponent = React.lazy(() => import('./HeavyComponent'));

// TailwindCSS
import clsx from 'clsx';
import { type VariantProps } from 'class-variance-authority';

// TanStack Query
import { useSuspenseQuery, useQuery, useQueryClient } from '@tanstack/react-query';

// Shadcn/ui Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';

// React Hook Form + Zod
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Types
import type { Delivery } from '@/types/delivery';
```

---

## Topic Guides

### 🎨 Component Patterns

**Modern React components use:**
- `React.FC<Props>` for type safety
- `React.lazy()` for code splitting
- Proper loading/error boundaries
- Named const + default export pattern

**Key Concepts:**
- Lazy load heavy components (DataGrid, charts, editors)
- Always wrap lazy components in Suspense
- Use Shadcn/ui components consistently
- Component structure: Props → Hooks → Handlers → Render → Export

**[📖 Complete Guide: resources/component-patterns.md](resources/component-patterns.md)**

---

### 📊 Data Fetching

**PRIMARY PATTERN: useSuspenseQuery**
- Use with Suspense boundaries
- Cache-first strategy
- Replaces `isLoading` checks
- Type-safe with generics

**API Service Layer:**
- Create `features/{feature}/api/{feature}Api.ts`
- Use axios/fetch client
- Centralized methods per feature
- Proper error handling

**[📖 Complete Guide: resources/data-fetching.md](resources/data-fetching.md)**

---

### 📁 File Organization

**features/ vs components/:**
- `features/`: Domain-specific (deliveries, warehouse, orders)
- `components/`: Truly reusable UI (Button, Input, etc.)

**Feature Subdirectories:**
```
features/
  deliveries/
    api/          # API service layer
    components/   # Feature components
    hooks/        # Custom hooks
    helpers/      # Utility functions
    types/        # TypeScript types
    index.ts      # Public exports
```

**[📖 Complete Guide: resources/file-organization.md](resources/file-organization.md)**

---

### 🎨 Styling with TailwindCSS

**Key Principles:**
- Use TailwindCSS utility classes
- Create component classes for complex styles
- Use `clsx` for conditional classes
- Type-safe variants with CVA (Class Variance Authority)

**Example:**
```typescript
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm">
    <h2 className="text-lg font-semibold text-gray-900">Title</h2>
    <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
        Action
    </button>
</div>
```

**Responsive Design:**
```typescript
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {items.map(item => <Item key={item.id} {...item} />)}
</div>
```

**Dark Mode:**
```typescript
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
    Content
</div>
```

**[📖 Complete Guide: resources/styling-guide.md](resources/styling-guide.md)**

---

### 🛣️ Routing

**Next.js App Router - Folder-Based:**
- Directory: `app/deliveries/page.tsx`
- Lazy load components
- Use layouts for common UI
- Server components for data fetching

**Example:**
```typescript
// app/deliveries/page.tsx
import { Suspense } from 'react';
import { DeliveriesList } from '@/features/deliveries/components/DeliveriesList';

export default function DeliveriesPage() {
    return (
        <div>
            <h1 className="text-2xl font-bold mb-4">Deliveries</h1>
            <Suspense fallback={<LoadingSkeleton />}>
                <DeliveriesList />
            </Suspense>
        </div>
    );
}
```

**[📖 Complete Guide: resources/routing-guide.md](resources/routing-guide.md)**

---

### ⏳ Loading & Error States

**CRITICAL RULE: Use Suspense Boundaries**

```typescript
// ✅ ALWAYS - Consistent layout, uses Suspense
<Suspense fallback={<SkeletonLoader />}>
    <DataComponent />
</Suspense>

// ❌ NEVER - Causes layout shift
if (isLoading) {
    return <LoadingSpinner />;
}
```

**Error Handling:**
- Use `useToast` for user feedback
- Proper error boundaries for crashes
- TanStack Query `onError` callbacks
- Graceful fallbacks

**[📖 Complete Guide: resources/loading-and-error-states.md](resources/loading-and-error-states.md)**

---

### ⚡ Performance

**Optimization Patterns:**
- `useMemo`: Expensive computations
- `useCallback`: Event handlers passed to children
- `React.memo`: Expensive components
- Image optimization with `next/image`
- Code splitting with `React.lazy`
- Debounced search (300-500ms)

**[📖 Complete Guide: resources/performance.md](resources/performance.md)**

---

### 📘 TypeScript

**Standards:**
- Strict mode, no `any` type
- Explicit return types on functions
- Type imports: `import type { Delivery } from '@/types'`
- Component prop interfaces with JSDoc

**[📖 Complete Guide: resources/typescript-standards.md](resources/typescript-standards.md)**

---

### 🔧 Common Patterns

**Covered Topics:**
- React Hook Form with Zod validation
- DataTable wrapper (TanStack Table)
- Dialog/Modal patterns
- Toast notifications
- Mutation patterns with cache invalidation
- Authentication with hooks

**[📖 Complete Guide: resources/common-patterns.md](resources/common-patterns.md)**

---

### 📚 Complete Examples

**Full working examples:**
- Modern component with all patterns
- Complete feature structure
- API service layer
- Page with data fetching
- Suspense + useQuery
- Form with validation
- Data table

**[📖 Complete Guide: resources/complete-examples.md](resources/complete-examples.md)**

---

## Navigation Guide

| Need to... | Read this resource |
|------------|-------------------|
| Create a component | [component-patterns.md](resources/component-patterns.md) |
| Fetch data | [data-fetching.md](resources/data-fetching.md) |
| Organize files/folders | [file-organization.md](resources/file-organization.md) |
| Style with TailwindCSS | [styling-guide.md](resources/styling-guide.md) |
| Set up routing | [routing-guide.md](resources/routing-guide.md) |
| Handle loading/errors | [loading-and-error-states.md](resources/loading-and-error-states.md) |
| Optimize performance | [performance.md](resources/performance.md) |
| TypeScript types | [typescript-standards.md](resources/typescript-standards.md) |
| Forms/Auth/DataTable | [common-patterns.md](resources/common-patterns.md) |
| See full examples | [complete-examples.md](resources/complete-examples.md) |

---

## Core Principles

1. **Lazy Load Everything Heavy**: Routes, DataGrid, charts, editors
2. **Suspense for Loading**: Use Suspense boundaries, not early returns
3. **useQuery/useSuspenseQuery**: Primary data fetching patterns
4. **Features are Organized**: api/, components/, hooks/, helpers/ subdirs
5. **TailwindCSS**: For all styling, use utility classes
6. **Shadcn/ui**: For component library consistency
7. **No Early Returns**: Prevents layout shift
8. **Toast Notifications**: For all user feedback
9. **TypeScript Strict**: Type-safe components and data
10. **Responsive Design**: Mobile-first with Tailwind breakpoints

---

## Quick Reference: File Structure

```
src/
  features/
    deliveries/
      api/
        deliveriesApi.ts          # API service
      components/
        DeliveriesList.tsx        # Main component
        DeliveryCard.tsx          # Related components
      hooks/
        useDeliveries.ts          # Custom hooks
        useSuspenseDeliveries.ts  # Suspense hooks
      helpers/
        deliveryHelpers.ts        # Utilities
      types/
        index.ts                  # TypeScript types
      index.ts                    # Public exports

  components/
    ui/
      button.tsx                  # Shadcn components
      input.tsx
      card.tsx
      table.tsx
    CustomHeader.tsx              # Reusable features

  app/
    deliveries/
      page.tsx                    # Route page
      create/
        page.tsx                  # Nested route
    warehouse/
      page.tsx
```

---

## Modern Component Template (Quick Copy)

```typescript
'use client';

import React, { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { deliveriesApi } from '../api/deliveriesApi';
import type { Delivery } from '@/types/delivery';

interface MyComponentProps {
    id: string;
    onAction?: () => void;
}

export const MyComponent: React.FC<MyComponentProps> = ({ id, onAction }) => {
    const [state, setState] = useState<string>('');
    const { toast } = useToast();

    const { data, isLoading, error } = useQuery({
        queryKey: ['delivery', id],
        queryFn: () => deliveriesApi.getDelivery(id),
    });

    const handleAction = useCallback(() => {
        setState('updated');
        toast({ title: 'Success', description: 'Action completed' });
        onAction?.();
    }, [onAction, toast]);

    if (error) {
        return <div className="text-red-600">Error loading data</div>;
    }

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>Component Title</CardTitle>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="h-10 bg-gray-200 rounded animate-pulse" />
                ) : (
                    <div className="space-y-2">
                        {/* Content */}
                    </div>
                )}
                <Button onClick={handleAction} className="mt-4">
                    Action
                </Button>
            </CardContent>
        </Card>
    );
};

export default MyComponent;
```

For complete examples, see [resources/complete-examples.md](resources/complete-examples.md)

---

## Stack Details

**Framework:** React 18 + Next.js 14
**Styling:** TailwindCSS 3.4
**UI Library:** Shadcn/ui (Radix UI based)
**Data Fetching:** TanStack Query v5
**Forms:** React Hook Form + Zod
**Tables:** TanStack Table v8
**Drag & Drop:** @dnd-kit
**Charts:** Recharts

---

## Related Skills

- **backend-dev-guidelines**: Backend API patterns that frontend consumes
- **error-tracking**: Error tracking and monitoring

---

**Skill Status**: Production-ready ✅
**Stack**: React 18 + Next.js 14 + TailwindCSS + Shadcn/ui ✅
**Progressive Disclosure**: 11 resource files ✅