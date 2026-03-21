import { useState, useEffect } from "react";

export function useCollapsible(storageKey: string, defaultOpen: boolean = false) {
  const [isOpen, setIsOpen] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    return saved !== null ? JSON.parse(saved) : defaultOpen;
  });

  const toggle = () => setIsOpen((prev: boolean) => !prev);
  const setOpen = (value: boolean) => setIsOpen(value);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(isOpen));
  }, [isOpen, storageKey]);

  return { isOpen, toggle, setOpen };
}
