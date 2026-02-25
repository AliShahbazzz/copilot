import { usePanel } from "../providers/PanelContext";

export const ThreadMessagesButton = ({ result }: { result: any }) => {
  const { setPanel } = usePanel();

  const component = result?.component;
  if (!component) return null;

  const { title, description, messages = [], total_messages } = component;

  const excludedKeys: string[] = [];
  const columns =
    messages.length > 0
      ? Object.keys(messages[0]).filter((k) => !excludedKeys.includes(k))
      : [];

  const formatHeader = (key: string) =>
    key
      .replace(/([A-Z])/g, " $1")
      .replace(/_/g, " ")
      .trim();

  const panel = (
    <div style={{ padding: "24px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "8px",
        }}
      >
        <h2 className="text-lg font-semibold">{title}</h2>
        <button
          onClick={() => setPanel(null)}
          className="rounded-full p-1.5 hover:bg-gray-100 transition-colors"
        >
          <svg
            className="w-4 h-4 text-gray-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
      <p className="text-xs text-gray-500 mb-4">{description}</p>
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-white">
          <tr className="border-b">
            {columns.map((col) => (
              <th
                key={col}
                className="text-left py-2 pr-6 font-medium text-gray-500 text-xs uppercase tracking-wide"
              >
                {formatHeader(col)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {messages.map((msg: any, idx: number) => (
            <tr key={idx} className="hover:bg-gray-50 transition-colors">
              {columns.map((col) => (
                <td
                  key={col}
                  className="py-3 pr-6 text-xs text-gray-600 max-w-xs"
                >
                  {!msg[col] || msg[col] === "N/A" ? (
                    <span className="italic text-gray-300">—</span>
                  ) : col === "text" ? (
                    <span className="whitespace-normal">{msg[col]}</span>
                  ) : (
                    String(msg[col])
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <button
      onClick={() => setPanel(panel)}
      className="w-full text-left rounded-xl border px-4 py-3 shadow-sm hover:shadow-md transition-all duration-200"
      style={{ borderColor: "#e5e7eb" }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-sm">{title}</p>
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        </div>
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
          {total_messages ?? messages.length} messages
        </span>
      </div>
    </button>
  );
};
