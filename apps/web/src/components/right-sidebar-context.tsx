"use client";

import { createContext, useContext, useRef, type ReactNode } from "react";

const RightSidebarContext = createContext<React.RefObject<HTMLDivElement | null> | null>(null);

export function useRightSidebarRef() {
  const ref = useContext(RightSidebarContext);
  if (!ref) throw new Error("useRightSidebarRef must be used within a RightSidebarProvider");
  return ref;
}

export function RightSidebarProvider({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <RightSidebarContext.Provider value={ref}>
      {children}
    </RightSidebarContext.Provider>
  );
}
