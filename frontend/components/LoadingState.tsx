import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
}

export default function LoadingState({ message = 'Loading content...' }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mb-3" />
      <p className="text-sm font-medium text-slate-600 animate-pulse">{message}</p>
    </div>
  );
}
