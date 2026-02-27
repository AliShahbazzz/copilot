export type StatusStep = {
  label: string;
  done: boolean;
};

export const AgentStatusIndicator = ({
  steps,
}: {
  steps: StatusStep[];
}) => {
  if (!steps.length) return null;

  return (
    <div className="my-1 flex flex-col gap-1">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center gap-2">
          {step.done ? (
            <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-emerald-50 text-[10px] font-bold text-emerald-600">
              ✓
            </span>
          ) : (
            <svg
              className="h-4 w-4 flex-shrink-0 animate-spin"
              style={{ animationDuration: "1.5s" }}
              viewBox="0 0 16 16"
              fill="none"
            >
              <circle
                cx="8"
                cy="8"
                r="6"
                stroke="#94a3b8"
                strokeWidth="1.5"
                strokeDasharray="3 3"
                strokeLinecap="round"
              />
            </svg>
          )}
          <span
            className={`text-xs ${step.done ? "text-slate-400" : "font-medium text-slate-600"}`}
          >
            {step.label}
          </span>
        </div>
      ))}
    </div>
  );
};
