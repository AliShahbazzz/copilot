import { usePanel } from '../providers/PanelContext';

interface Customer {
  id: string;
  name: string;
  location: string;
  phone: string;
}

export interface CustomerListPayload {
  type: 'ui_action';
  component: {
    type: 'customer_list';
    title: string;
    description: string;
    customers: Customer[];
  };
}

export const CustomerListButton = ({
  result,
}: {
  result: CustomerListPayload;
}) => {
  const { setPanel } = usePanel();

  if (!result?.component) return <></>;
  const { title, description, customers } = result.component;

  const panel = (
    <div style={{ padding: '24px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px',
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
            <th className="text-left py-2 pr-6 font-medium text-gray-500 text-xs uppercase tracking-wide">
              Name
            </th>
            <th className="text-left py-2 pr-6 font-medium text-gray-500 text-xs uppercase tracking-wide">
              Phone
            </th>
            <th className="text-left py-2 font-medium text-gray-500 text-xs uppercase tracking-wide">
              Location
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {customers?.map((customer) => (
            <tr
              key={customer.id}
              className="hover:bg-gray-50 transition-colors"
            >
              <td className="py-3 pr-6 font-medium">{customer.name}</td>
              <td className="py-3 pr-6 text-gray-500 font-mono text-xs">
                {customer.phone}
              </td>
              <td className="py-3 text-gray-500 text-xs max-w-xs truncate">
                {customer.location === 'N/A' ? (
                  <span className="italic text-gray-300">No location</span>
                ) : (
                  customer.location
                )}
              </td>
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
      style={{ borderColor: '#e5e7eb' }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-sm">{title}</p>
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        </div>
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
          {customers?.length ?? 0} results
        </span>
      </div>
    </button>
  );
};
