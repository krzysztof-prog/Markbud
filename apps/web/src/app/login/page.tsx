/**
 * Login Page
 * Strona logowania użytkownika
 */

import React from 'react';
import { LoginForm } from '@/features/auth/components/LoginForm';

// Wymuszenie dynamicznego renderowania - strona używa AuthContext
export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <LoginForm />
    </div>
  );
}
