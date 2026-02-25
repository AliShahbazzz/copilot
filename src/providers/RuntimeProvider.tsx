import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
  useCallback,
} from 'react';
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

type LoadingState = 'thinking' | 'searching' | 'messaging' | 'executing' | null;

interface ToolStatusEntry {
  id: string;
  phase: string;
  message: string;
  tool?: string;
  timestamp: Date;
}

interface ToolStatusContextValue {
  currentMessage: string | null;
  history: ToolStatusEntry[];
  loadingState: LoadingState;
}

const ToolStatusContext = createContext<ToolStatusContextValue | undefined>(
  undefined,
);

export const useToolStatus = () => {
  const context = useContext(ToolStatusContext);
  if (!context) {
    throw new Error('useToolStatus must be used within RuntimeProvider');
  }
  return context;
};

export function RuntimeProvider({
  children,
  token,
  sellerWorkspaceId,
  waConfigId,
  sellerDetails,
}: Props) {
  const [history, setHistory] = useState<ToolStatusEntry[]>([]);
  const [currentMessage, setCurrentMessage] = useState<string | null>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>(null);

  const pushStatus = useCallback(
    (entry: { phase: string; message: string; tool?: string }) => {
      setCurrentMessage(entry.message);
      setHistory((prev) => {
        const nextEntry: ToolStatusEntry = {
          id: `status-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          phase: entry.phase,
          message: entry.message,
          tool: entry.tool,
          timestamp: new Date(),
        };
        return [...prev, nextEntry].slice(-10);
      });
    },
    [],
  );

  const handleStatusUpdate = useCallback(
    (payload: { phase: string; message: string; tool?: string }) => {
      pushStatus(payload);
      if (payload.phase === 'tool_start') {
        if (payload.tool?.includes('search')) {
          setLoadingState('searching');
        } else if (
          payload.tool?.includes('message') ||
          payload.tool?.includes('whatsapp')
        ) {
          setLoadingState('messaging');
        } else {
          setLoadingState('executing');
        }
      } else if (payload.phase === 'tool_end') {
        setLoadingState(null);
      }
    },
    [pushStatus],
  );

  const adapter = useMemo(
    () =>
      createSellerCopilotAdapter(
        () => token, // getToken — swap with useAuth() hook later
        SESSION_THREAD_ID,
        { sellerWorkspaceId, waConfigId, sellerDetails },
        { onStatusUpdate: handleStatusUpdate },
      ),
    [token, sellerWorkspaceId, waConfigId, sellerDetails, handleStatusUpdate],
  );

  const runtime = useLocalRuntime(adapter);
  const contextValue = useMemo(
    () => ({ currentMessage, history, loadingState }),
    [currentMessage, history, loadingState],
  );

  return (
    <ToolStatusContext.Provider value={contextValue}>
      <AssistantRuntimeProvider runtime={runtime}>
        {children}
      </AssistantRuntimeProvider>
    </ToolStatusContext.Provider>
  );
}
