import '@assistant-ui/react-ui/styles/index.css';
import './app.css';
import { useMemo, useState } from 'react';
import { Thread } from '@assistant-ui/react-ui';
import { RuntimeProvider } from '../providers/RuntimeProvider';
import { ToolUIRegistry } from '../tools';
import { PanelProvider, usePanel } from '../providers/PanelContext';
import { MiniLogin, type CopilotAuthConfig } from '../components/MiniLogin';

const STORAGE_KEYS = {
  token: 'seller_token',
  workspaceId: 'seller_workspace_id',
  waConfigId: 'wa_config_id',
  sellerDetails: 'seller_details',
} as const;

const loadInitialConfig = (): CopilotAuthConfig | null => {
  const token = localStorage.getItem(STORAGE_KEYS.token) || '';
  const sellerWorkspaceId = localStorage.getItem(STORAGE_KEYS.workspaceId) || '';
  const waConfigId = localStorage.getItem(STORAGE_KEYS.waConfigId) || undefined;
  const rawSellerDetails = localStorage.getItem(STORAGE_KEYS.sellerDetails);

  if (!token || !sellerWorkspaceId) {
    return null;
  }

  let sellerDetails: CopilotAuthConfig['sellerDetails'] | undefined;
  if (rawSellerDetails) {
    try {
      sellerDetails = JSON.parse(rawSellerDetails) as CopilotAuthConfig['sellerDetails'];
    } catch {
      sellerDetails = undefined;
    }
  }

  return {
    sellerToken: token,
    sellerWorkspaceId,
    waConfigId,
    sellerDetails,
  };
};

const ThreadLayout = () => {
  const { panel } = usePanel();
  return (
    <div style={{ height: '100vh', display: 'flex' }}>
      <div
        style={{
          flex: 1,
          minWidth: 0,
          transition: 'flex 300ms ease',
          overflow: 'hidden',
        }}
      >
        <ToolUIRegistry />
        <Thread />
      </div>
      {panel ? (
        <div
          style={{
            flex: 1,
            minWidth: 0,
            borderLeft: '1px solid #e5e7eb',
            overflowY: 'auto',
            transition: 'flex 300ms ease',
            backgroundColor: 'white',
          }}
        >
          {panel}
        </div>
      ) : null}
    </div>
  );
};

export default function App() {
  const [config, setConfig] = useState<CopilotAuthConfig | null>(() => loadInitialConfig());

  const loginHint = useMemo(
    () =>
      config
        ? `Workspace: ${config.sellerWorkspaceId}`
        : 'Please login using MiniLogin to initialize seller token.',
    [config],
  );

  return (
    <div className="h-screen w-screen bg-slate-50 text-slate-900">
      <div className="grid h-full grid-cols-[320px_1fr]">
        <aside className="border-r border-slate-200 bg-white p-4">
          <div className="mb-4 rounded border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            {loginHint}
          </div>
          <MiniLogin
            currentConfig={config}
            onLoginSuccess={(next) => setConfig(next)}
            onLogout={() => setConfig(null)}
          />
        </aside>

        <main className="min-w-0">
          {config ? (
            <RuntimeProvider
              token={config.sellerToken}
              sellerWorkspaceId={config.sellerWorkspaceId}
              waConfigId={config.waConfigId}
              sellerDetails={config.sellerDetails}
            >
              <PanelProvider>
                <ThreadLayout />
              </PanelProvider>
            </RuntimeProvider>
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
                <p className="text-sm font-semibold text-slate-900">Login required</p>
                <p className="mt-2 text-xs text-slate-600">
                  Use MiniLogin on the left to fetch seller token and workspace context.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
