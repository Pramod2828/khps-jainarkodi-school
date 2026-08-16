import { FolderOpen } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  message?: string;
  actionText?: string;
  onAction?: () => void;
}

export default function EmptyState({
  title = 'No records found',
  message = 'There is currently no data available for this section.',
  actionText,
  onAction
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 my-4">
      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
        <FolderOpen className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-slate-800">{title}</h3>
      <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">{message}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition shadow-sm"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}
