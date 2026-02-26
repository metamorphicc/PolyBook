"use client";
import { createContext, useContext, useState, ReactNode } from "react";
import { PortalWrapper } from "./PortalWrapped";
type ModalContextType = {
  openModal: (content: ReactNode) => void;
  closeModal: () => void;
};

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<ReactNode | null>(null);

  const openModal = (node: ReactNode) => setContent(node);
  const closeModal = () => setContent(null);

  return (
    <ModalContext.Provider value={{ openModal, closeModal }}>
      {children}
      {content && <PortalWrapper onClose={closeModal}>{content}</PortalWrapper>}
    </ModalContext.Provider>
  );
}

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) throw new Error("useModal must be used within ModalProvider");
  return context;
};
