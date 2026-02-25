import { createContext, useContext, useState, ReactNode } from 'react';

const PanelContext = createContext<{
  panel: ReactNode | null;
  setPanel: (node: ReactNode | null) => void;
}>({ panel: null, setPanel: () => {} });

export const PanelProvider = ({ children }: { children: ReactNode }) => {
  const [panel, setPanel] = useState<ReactNode | null>(null);
  return (
    <PanelContext.Provider value={{ panel, setPanel }}>
      {children}
    </PanelContext.Provider>
  );
};

export const usePanel = () => useContext(PanelContext);
