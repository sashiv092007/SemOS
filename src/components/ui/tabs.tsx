"use client";

import { createContext, useContext, useId, useState, type ComponentProps, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

/**
 * Tabs primitives with the same names and props as shadcn/ui's tabs
 * (`defaultValue`, `value`, `onValueChange`, `data-state="active"`).
 * Arrow keys, Home and End move between tabs.
 */

type TabsContextValue = { current: string | undefined; select: (value: string) => void; baseId: string };

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabs() {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("Tabs parts must be used inside <Tabs>");
  return ctx;
}

type TabsProps = Omit<ComponentProps<"div">, "defaultValue"> & {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
};

export function Tabs({ defaultValue, value, onValueChange, className, children, ...props }: TabsProps) {
  const [inner, setInner] = useState(defaultValue);
  const controlled = value !== undefined;
  const current = controlled ? value : inner;
  const baseId = useId();

  const select = (next: string) => {
    if (!controlled) setInner(next);
    onValueChange?.(next);
  };

  return (
    <TabsContext.Provider value={{ current, select, baseId }}>
      <div data-slot="tabs" className={cn("flex flex-col", className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export function TabsList({ className, onKeyDown, ...props }: ComponentProps<"div">) {
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(e);
    if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(e.key)) return;
    const tabs = [...e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]:not([disabled])')];
    const i = tabs.indexOf(document.activeElement as HTMLButtonElement);
    if (i < 0) return;
    e.preventDefault();
    const next =
      e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : (i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length;
    tabs[next].focus();
    tabs[next].click();
  };

  return (
    <div
      role="tablist"
      data-slot="tabs-list"
      onKeyDown={handleKeyDown}
      className={cn("inline-flex items-center rounded-lg p-1", className)}
      {...props}
    />
  );
}

type TabsTriggerProps = Omit<ComponentProps<"button">, "value"> & { value: string };

export function TabsTrigger({ value, className, onClick, ...props }: TabsTriggerProps) {
  const { current, select, baseId } = useTabs();
  const active = current === value;
  return (
    <button
      type="button"
      role="tab"
      data-slot="tabs-trigger"
      id={`${baseId}-tab-${value}`}
      aria-selected={active}
      aria-controls={`${baseId}-panel-${value}`}
      data-state={active ? "active" : "inactive"}
      tabIndex={active ? 0 : -1}
      onClick={(e) => {
        onClick?.(e);
        select(value);
      }}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium text-slate-400 transition-all hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

type TabsContentProps = ComponentProps<"div"> & { value: string; forceMount?: boolean };

export function TabsContent({ value, className, forceMount = false, ...props }: TabsContentProps) {
  const { current, baseId } = useTabs();
  const active = current === value;
  if (!active && !forceMount) return null;
  return (
    <div
      role="tabpanel"
      data-slot="tabs-content"
      id={`${baseId}-panel-${value}`}
      aria-labelledby={`${baseId}-tab-${value}`}
      data-state={active ? "active" : "inactive"}
      hidden={!active}
      tabIndex={0}
      className={cn("focus-visible:outline-none", className)}
      {...props}
    />
  );
}
