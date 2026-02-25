import { useAssistantToolUI } from '@assistant-ui/react';
import { CustomerListButton } from '../components/CustomerListButton';
import type { CustomerListPayload } from '../components/CustomerListButton';

export const ToolUIRegistry = () => {
  useAssistantToolUI({
    toolName: 'search_customers_master',
    render: ({ result }) => {
      if (!result) return null;
      return <CustomerListButton result={result as CustomerListPayload} />;
    },
  });

  useAssistantToolUI({
    toolName: 'search_orders',
    render: () => <>Hello OrderCardUI</>,
  });
  useAssistantToolUI({
    toolName: 'get_product_list',
    render: () => <>Hello ProductCardUI</>,
  });

  return null; // single return at the end
};
