import { useMemo } from 'react';
import { useToolStatus } from '../providers/RuntimeProvider';

export function ToolStatusPanel() {
  const { currentMessage, history, loadingState } = useToolStatus();
  const recent = useMemo(() => history.slice(-3).reverse(), [history]);

  if (!currentMessage) return null;

  const label =
    loadingState === 'searching'
      ? 'Searching'
      : loadingState === 'messaging'
        ? 'Messaging'
        : loadingState === 'executing'
          ? 'Executing'
          : 'Working';

  return (
    <div className="pointer-events-none absolute left-1/2 bottom-[96px] z-10 w-80 max-w-full -translate-x-1/2">
      <div className="rounded-2xl border border-slate-200 bg-white/95 p-3 text-sm shadow-lg backdrop-blur">
        <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-slate-500">
          <span>{label}</span>
          <span className="text-xs text-slate-400">Tool status</span>
        </div>
        <p className="mt-1 truncate font-semibold text-slate-900">{currentMessage}</p>
        {recent.length > 0 && (
          <div className="mt-2 space-y-1 text-[11px] text-slate-600">
            {recent.map((entry) => (
              <div key={entry.id} className="flex justify-between gap-1">
                <span className="font-semibold text-slate-800">{entry.phase}</span>
                <span className="truncate">{entry.tool ?? entry.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
