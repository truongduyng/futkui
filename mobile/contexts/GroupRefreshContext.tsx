import React, { createContext, useContext } from 'react';

interface GroupRefreshContextType {
  refreshGroups: () => Promise<void>;
}

const GroupRefreshContext = createContext<GroupRefreshContextType | undefined>(undefined);

export function GroupRefreshProvider({ 
  children, 
  refreshGroups 
}: { 
  children: React.ReactNode;
  refreshGroups: () => Promise<void>;
}) {
  return (
    <GroupRefreshContext.Provider value={{ refreshGroups }}>
      {children}
    </GroupRefreshContext.Provider>
  );
}

export function useGroupRefresh() {
  const context = useContext(GroupRefreshContext);
  if (context === undefined) {
    throw new Error('useGroupRefresh must be used within a GroupRefreshProvider');
  }
  return context;
}