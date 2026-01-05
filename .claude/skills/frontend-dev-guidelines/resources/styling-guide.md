# Styling Guide

Modern styling patterns using TailwindCSS 3.4 with Shadcn/ui components.

---

## TailwindCSS Overview

**TailwindCSS** is the primary styling approach:
- Utility-first CSS framework
- Responsive design with breakpoint prefixes
- Dark mode support with `dark:` prefix
- Consistent spacing and color scales

---

## Basic Styling

### Utility Classes

```typescript
// Layout
<div className="flex items-center justify-between p-4">
    <h1 className="text-2xl font-bold">Title</h1>
    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg">
        Action
    </button>
</div>

// Spacing
<div className="p-4 m-2 space-y-4">
    <p className="mt-2 mb-4">Content with spacing</p>
</div>

// Colors
<div className="bg-white text-gray-900 border border-gray-200">
    <span className="text-blue-600">Link color</span>
    <span className="text-red-500">Error color</span>
    <span className="text-green-600">Success color</span>
</div>
```

### Conditional Classes with clsx

```typescript
import clsx from 'clsx';

interface ButtonProps {
    variant: 'primary' | 'secondary' | 'danger';
    disabled?: boolean;
}

const Button: React.FC<ButtonProps> = ({ variant, disabled, children }) => {
    return (
        <button
            className={clsx(
                // Base styles
                'px-4 py-2 rounded-lg font-medium transition-colors',
                // Variant styles
                {
                    'bg-blue-600 text-white hover:bg-blue-700': variant === 'primary',
                    'bg-gray-200 text-gray-900 hover:bg-gray-300': variant === 'secondary',
                    'bg-red-600 text-white hover:bg-red-700': variant === 'danger',
                },
                // Disabled state
                disabled && 'opacity-50 cursor-not-allowed'
            )}
            disabled={disabled}
        >
            {children}
        </button>
    );
};
```

---

## Responsive Design

### Breakpoint Prefixes

```typescript
// Mobile-first approach
<div className="
    grid
    grid-cols-1      // Mobile: 1 column
    sm:grid-cols-2   // >=640px: 2 columns
    md:grid-cols-3   // >=768px: 3 columns
    lg:grid-cols-4   // >=1024px: 4 columns
    xl:grid-cols-6   // >=1280px: 6 columns
    gap-4
">
    {items.map(item => <Card key={item.id} {...item} />)}
</div>

// Responsive padding
<div className="p-2 sm:p-4 md:p-6 lg:p-8">
    Content
</div>

// Hide/show at breakpoints
<div className="hidden md:block">Desktop only</div>
<div className="md:hidden">Mobile only</div>
```

### Breakpoint Values

| Prefix | Min Width | CSS |
|--------|-----------|-----|
| `sm:` | 640px | `@media (min-width: 640px)` |
| `md:` | 768px | `@media (min-width: 768px)` |
| `lg:` | 1024px | `@media (min-width: 1024px)` |
| `xl:` | 1280px | `@media (min-width: 1280px)` |
| `2xl:` | 1536px | `@media (min-width: 1536px)` |

---

## Dark Mode

```typescript
// Dark mode with dark: prefix
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
    <p className="text-gray-600 dark:text-gray-400">
        Muted text
    </p>
    <div className="border border-gray-200 dark:border-gray-700">
        Card content
    </div>
</div>

// Hover states in dark mode
<button className="
    bg-blue-600 hover:bg-blue-700
    dark:bg-blue-500 dark:hover:bg-blue-600
">
    Action
</button>
```

---

## Shadcn/ui Components

### Using Shadcn/ui

Shadcn/ui provides accessible, styled components built on Radix UI:

```typescript
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';

// Button variants
<Button variant="default">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>

// Card component
<Card>
    <CardHeader>
        <CardTitle>Card Title</CardTitle>
    </CardHeader>
    <CardContent>
        Card content here
    </CardContent>
</Card>

// Form with labels
<div className="space-y-4">
    <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" placeholder="email@example.com" />
    </div>
</div>
```

### Extending Shadcn/ui with Tailwind

```typescript
// Add custom styles to Shadcn components
<Button className="w-full mt-4">
    Full Width Button
</Button>

<Card className="hover:shadow-lg transition-shadow">
    Hover effect card
</Card>

<Input className="text-lg" placeholder="Large input" />
```

---

## Common Patterns

### Flexbox Layout

```typescript
// Row with spacing
<div className="flex items-center gap-4">
    <Avatar />
    <div className="flex-1">
        <h3 className="font-semibold">{name}</h3>
        <p className="text-sm text-gray-500">{email}</p>
    </div>
    <Button>Edit</Button>
</div>

// Space between
<div className="flex justify-between items-center">
    <h1>Title</h1>
    <div className="flex gap-2">
        <Button variant="outline">Cancel</Button>
        <Button>Save</Button>
    </div>
</div>

// Column layout
<div className="flex flex-col gap-4">
    <Input placeholder="Name" />
    <Input placeholder="Email" />
    <Button>Submit</Button>
</div>
```

### Grid Layout

```typescript
// Equal columns
<div className="grid grid-cols-3 gap-4">
    <Card>Item 1</Card>
    <Card>Item 2</Card>
    <Card>Item 3</Card>
</div>

// Sidebar layout
<div className="grid grid-cols-[250px_1fr] gap-6">
    <aside className="border-r">Sidebar</aside>
    <main>Main content</main>
</div>

// Dashboard grid
<div className="grid grid-cols-12 gap-4">
    <div className="col-span-8">Main content</div>
    <div className="col-span-4">Sidebar</div>
</div>
```

### Spacing Scale

```
p-0   = 0px
p-1   = 4px
p-2   = 8px
p-3   = 12px
p-4   = 16px
p-5   = 20px
p-6   = 24px
p-8   = 32px
p-10  = 40px
p-12  = 48px
p-16  = 64px
```

---

## Typography

```typescript
// Headings
<h1 className="text-3xl font-bold">Heading 1</h1>
<h2 className="text-2xl font-semibold">Heading 2</h2>
<h3 className="text-xl font-medium">Heading 3</h3>

// Text sizes
<p className="text-sm">Small text</p>
<p className="text-base">Base text (16px)</p>
<p className="text-lg">Large text</p>
<p className="text-xl">Extra large</p>

// Text colors
<p className="text-gray-900">Primary text</p>
<p className="text-gray-600">Secondary text</p>
<p className="text-gray-400">Muted text</p>

// Font weight
<span className="font-normal">Normal</span>
<span className="font-medium">Medium</span>
<span className="font-semibold">Semibold</span>
<span className="font-bold">Bold</span>
```

---

## Animations & Transitions

```typescript
// Hover transitions
<button className="
    bg-blue-600
    hover:bg-blue-700
    transition-colors
    duration-200
">
    Smooth hover
</button>

// Transform on hover
<div className="hover:scale-105 transition-transform duration-200">
    Scale on hover
</div>

// Loading animation
<div className="animate-pulse bg-gray-200 h-4 rounded" />

// Spin animation (loading)
<div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full" />
```

---

## Class Variance Authority (CVA)

For type-safe component variants:

```typescript
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
    // Base styles
    'inline-flex items-center justify-center rounded-md font-medium transition-colors',
    {
        variants: {
            variant: {
                default: 'bg-blue-600 text-white hover:bg-blue-700',
                secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
                destructive: 'bg-red-600 text-white hover:bg-red-700',
                outline: 'border border-gray-300 bg-transparent hover:bg-gray-100',
            },
            size: {
                sm: 'h-8 px-3 text-sm',
                md: 'h-10 px-4',
                lg: 'h-12 px-6 text-lg',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'md',
        },
    }
);

interface ButtonProps extends VariantProps<typeof buttonVariants> {
    children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({ variant, size, children }) => {
    return (
        <button className={buttonVariants({ variant, size })}>
            {children}
        </button>
    );
};

// Usage
<Button variant="destructive" size="lg">Delete</Button>
```

---

## Project Color Palette

AKROBUD uses semantic color naming:

```typescript
// Status colors
<span className="text-green-600">Ukończone</span>      // Success/Complete
<span className="text-yellow-600">W trakcie</span>     // Warning/In Progress
<span className="text-red-600">Błąd</span>             // Error/Danger
<span className="text-blue-600">Informacja</span>      // Info
<span className="text-gray-500">Archiwum</span>        // Muted/Archived

// Background status colors
<div className="bg-green-100 text-green-800">Completed</div>
<div className="bg-yellow-100 text-yellow-800">Pending</div>
<div className="bg-red-100 text-red-800">Error</div>
```

---

## Accessibility (A11y)

### Focus States

```typescript
// Visible focus ring
<button className="
    focus:outline-none
    focus:ring-2
    focus:ring-blue-500
    focus:ring-offset-2
">
    Accessible button
</button>

// Focus-visible (only on keyboard navigation)
<a className="
    focus-visible:outline-none
    focus-visible:ring-2
    focus-visible:ring-blue-500
">
    Link
</a>
```

### Screen Reader Support

```typescript
// Visually hidden but accessible
<span className="sr-only">Close dialog</span>

// Skip link
<a href="#main-content" className="sr-only focus:not-sr-only">
    Skip to main content
</a>
```

### Color Contrast

- Use `text-gray-900` on light backgrounds
- Use `text-white` on dark backgrounds
- Avoid `text-gray-400` for important content (too low contrast)

---

## What NOT to Use

### ❌ Inline Styles

```typescript
// ❌ AVOID
<div style={{ padding: '16px', backgroundColor: 'blue' }}>
    Content
</div>

// ✅ USE Tailwind
<div className="p-4 bg-blue-600">
    Content
</div>
```

### ❌ CSS Modules (unless necessary)

```typescript
// ❌ AVOID for simple styling
import styles from './Button.module.css';
<button className={styles.button}>Click</button>

// ✅ USE Tailwind + clsx
<button className={clsx('px-4 py-2 bg-blue-600', disabled && 'opacity-50')}>
    Click
</button>
```

### ❌ Material-UI / MUI

```typescript
// ❌ NOT USED IN THIS PROJECT
import { Box, Button } from '@mui/material';
<Box sx={{ p: 2 }}>Content</Box>

// ✅ USE Shadcn/ui + Tailwind
import { Card } from '@/components/ui/card';
<Card className="p-4">Content</Card>
```

---

## Summary

**Styling Checklist:**
- ✅ Use TailwindCSS utility classes
- ✅ Use `clsx` for conditional classes
- ✅ Use Shadcn/ui components for UI elements
- ✅ Mobile-first responsive design (`sm:`, `md:`, `lg:`)
- ✅ Dark mode with `dark:` prefix
- ✅ Use CVA for complex variant components
- ✅ Focus states for accessibility
- ❌ No inline styles
- ❌ No MUI/Material-UI

**See Also:**
- [component-patterns.md](component-patterns.md) - Component structure
- [complete-examples.md](complete-examples.md) - Full styling examples
