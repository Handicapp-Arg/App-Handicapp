'use client';

import { forwardRef } from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = '', ...props }, ref) => (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-gray-700">{label}</label>
      )}
      <textarea
        ref={ref}
        className={[
          'w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5',
          'text-sm text-gray-900 transition resize-none',
          'focus:border-[#0f1f3d] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0f1f3d]/10',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : '',
          className,
        ].filter(Boolean).join(' ')}
        {...props}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  ),
);
Textarea.displayName = 'Textarea';
