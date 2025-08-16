import React, { createContext, useContext, useState } from 'react';

interface UnreadCountContextType {
  totalUnreadCount: number;
  setTotalUnreadCount: (count: number) => void;
}

const UnreadCountContext = createContext<UnreadCountContextType | undefined>(undefined);

export function UnreadCountProvider({ children }: { children: React.ReactNode }) {
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);

  return (
    <UnreadCountContext.Provider value={{ totalUnreadCount, setTotalUnreadCount }}>
      {children}
    </UnreadCountContext.Provider>
  );
}

export function useUnreadCount() {
  const context = useContext(UnreadCountContext);
  if (context === undefined) {
    throw new Error('useUnreadCount must be used within an UnreadCountProvider');
  }
  return context;
}