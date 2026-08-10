"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

interface SlideUpModalContextType {
  close: () => void;
}

const SlideUpModalContext = createContext<SlideUpModalContextType>({
  close: () => {},
});

export function useSlideUpClose() {
  return useContext(SlideUpModalContext);
}

interface SlideUpModalProps {
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

export function SlideUpModal({
  onClose,
  children,
  className,
}: SlideUpModalProps) {
  const [closing, setClosing] = useState(false);

  const close = useCallback(() => {
    if (closing) return;
    setClosing(true);
    setTimeout(() => onClose(), 300);
  }, [closing, onClose]);

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-end sm:items-center",
        closing ? "animate-fade-out" : "animate-fade-in",
      )}
    >
      <div className="absolute inset-0 bg-black/60" onClick={close} />
      <div
        className={cn(
          "relative w-full max-w-md mx-auto bg-gray-800 border-t sm:border border-gray-700 rounded-t-3xl sm:rounded-2xl sm:shadow-2xl",
          closing
            ? "animate-slide-down sm:animate-modal-out"
            : "animate-slide-up sm:animate-modal-in",
          className,
        )}
      >
        <SlideUpModalContext.Provider value={{ close }}>
          {children}
        </SlideUpModalContext.Provider>
      </div>
    </div>
  );
}
