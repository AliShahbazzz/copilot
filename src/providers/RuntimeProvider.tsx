import { useMemo, type ReactNode } from 'react';
import { AssistantRuntimeProvider, useLocalRuntime } from '@assistant-ui/react';
import { createSellerCopilotAdapter } from './SellerCopilotAdapter';
import { v4 as uuid } from 'uuid';

// One stable thread ID per app session
// Later you can lift this to a thread-list state if you need multi-thread
const SESSION_THREAD_ID = uuid();

interface Props {
  children: ReactNode;
  token: string;
  sellerWorkspaceId?: string;
  waConfigId?: string;
  sellerDetails?: object;
}

export function RuntimeProvider({
  children,
  token,
  sellerWorkspaceId,
  waConfigId,
  sellerDetails,
}: Props) {
  const adapter = useMemo(
    () =>
      createSellerCopilotAdapter(
        () => token, // getToken — swap with useAuth() hook later
        SESSION_THREAD_ID,
        { sellerWorkspaceId, waConfigId, sellerDetails }
      ),
    [token, sellerWorkspaceId, waConfigId, sellerDetails]
  );

  const runtime = useLocalRuntime(adapter);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}
