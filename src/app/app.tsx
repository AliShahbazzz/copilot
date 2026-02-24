import '@assistant-ui/react-ui/styles/index.css';
import './app.css';
import { Thread } from '@assistant-ui/react-ui';
import { RuntimeProvider } from '../providers/RuntimeProvider';
import { ToolUIRegistry } from '../tools';
import { PanelProvider, usePanel } from '../providers/PanelContext';

const AppLayout = () => {
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
      {panel && (
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
      )}
    </div>
  );
};

export default function App() {
  return (
    <RuntimeProvider
      token="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoiODNjOWYzNzctNTg5My00MjBhLWIxY2EtZjQxZWMyY2VhNjFhIiwid29ya3NwYWNlSWQiOiIwODc4YzliMy1kNGZjLTRiNmQtODFiMi04OWZhNDU5MDI0ZWEiLCJ3b3Jrc3BhY2VSb2xlcyI6WyJhZG0iXX0sImlhdCI6MTc3MTg3MDk1MSwiZXhwIjoxNzc0MjkwMTUxfQ.IOrPFkHKXZP6ET7NzZWrhdSZSG2BSAXQ5bHmunNBtFo"
      sellerWorkspaceId="0878c9b3-d4fc-4b6d-81b2-89fa459024ea"
    >
      <PanelProvider>
        <AppLayout />
      </PanelProvider>
    </RuntimeProvider>
  );
}
