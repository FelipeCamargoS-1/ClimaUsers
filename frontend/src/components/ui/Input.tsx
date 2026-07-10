import React from 'react';
import { twMerge } from 'tailwind-merge';

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string; icon?: React.ReactNode };

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ label, error, icon, className, ...props }, ref) => (
  <label className="flex flex-col gap-1.5 text-sm font-medium">
    {label && <span>{label}</span>}
    <span className="relative">
      {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</span>}
      <input ref={ref} className={twMerge('h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring', icon ? 'pl-10' : '', className)} {...props} />
    </span>
    {error && <span className="text-xs text-destructive">{error}</span>}
  </label>
));
Input.displayName = 'Input';
