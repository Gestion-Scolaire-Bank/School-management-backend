import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';

/**
 * FormCard – a glassmorphism styled wrapper for forms.
 * Uses Tailwind utilities to achieve a translucent background with backdrop blur.
 * It accepts the same props as the standard Card component.
 */
export default function FormCard({ title, description, children, className }) {
  return (
    <Card
      className={`bg-white/30 dark:bg-black/30 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-xl shadow-xl transition-shadow hover:shadow-2xl ${className}`}
    >
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          {title}
        </CardTitle>
        {description && (
          <CardDescription className="text-sm text-gray-600 dark:text-gray-400">
            {description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">{children}</CardContent>
    </Card>
  );
}
