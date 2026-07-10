import { Loader2 } from 'lucide-react';

export function LoadingSpinner({ className = 'h-6 w-6' }: { className?: string }) {
  return <Loader2 className={`${className} animate-spin text-primary`} />;
}
