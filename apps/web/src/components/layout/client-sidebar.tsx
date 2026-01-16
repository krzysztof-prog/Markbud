'use client';

// Bezposredni import - next/dynamic powoduje blad "Cannot read properties of undefined (reading 'call')"
// w Next.js 15.5.7. Sidebar jest uzywany na kazdej stronie wiec lazy loading nie daje korzysci.
import { Sidebar } from './sidebar';

export function ClientSidebar() {
  return <Sidebar />;
}
