"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { BrandMark } from "@/components/BrandMark";
import {
  HeaderAuthLinks,
  MobileHeaderAuthLink,
} from "@/components/auth/HeaderAuthLinks";
import { HeaderToolSearch } from "@/components/header/HeaderToolSearch";
import {
  getHeaderToolSearchItems,
  getToolDiscoveryGroups,
  type ToolDiscoveryGroup,
  type ToolDiscoveryGroupId,
  type ToolDiscoveryItem,
} from "@/lib/home/homepage-tools";
import type { PublicLaunchCapabilitySnapshot } from "@/lib/public-launch";

function DiscoveryTool({
  item,
  onNavigate,
}: {
  readonly item: ToolDiscoveryItem;
  readonly onNavigate?: () => void;
}) {
  const Icon = item.tool.icon;
  const content = (
    <>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
        <Icon size={17} strokeWidth={2} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-bold">
        {item.tool.title}
      </span>
      {item.availability === "coming-soon" ? (
        <span className="shrink-0 text-[9px] font-bold uppercase tracking-[0.08em] text-slate-500">
          Coming soon
        </span>
      ) : null}
    </>
  );

  if (item.availability === "coming-soon") {
    return (
      <div
        role="link"
        aria-disabled="true"
        className="flex min-h-12 cursor-not-allowed items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50/70 px-2.5 py-2 text-slate-500"
      >
        {content}
      </div>
    );
  }

  return (
    <Link
      href={item.tool.href}
      onClick={onNavigate}
      className="flex min-h-12 items-center gap-2.5 rounded-xl border border-transparent px-2.5 py-2 text-slate-800 outline-none transition hover:border-violet-100 hover:bg-violet-50 hover:text-violet-800 focus-visible:ring-4 focus-visible:ring-violet-100"
    >
      {content}
    </Link>
  );
}

function CategoryTabs({
  groups,
  selectedId,
  orientation,
  idPrefix,
  tabRefs,
  onSelect,
}: {
  readonly groups: readonly ToolDiscoveryGroup[];
  readonly selectedId: ToolDiscoveryGroupId;
  readonly orientation: "horizontal" | "vertical";
  readonly idPrefix: string;
  readonly tabRefs?: React.MutableRefObject<
    Map<ToolDiscoveryGroupId, HTMLButtonElement>
  >;
  readonly onSelect: (id: ToolDiscoveryGroupId) => void;
}) {
  const vertical = orientation === "vertical";

  return (
    <div
      role="tablist"
      aria-label="PDF tool categories"
      aria-orientation={orientation}
      className={
        vertical
          ? "space-y-1"
          : "flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none]"
      }
    >
      {groups.map((group, index) => {
        const selected = group.id === selectedId;
        return (
          <button
            key={group.id}
            ref={(node) => {
              if (!tabRefs) return;
              if (node) tabRefs.current.set(group.id, node);
              else tabRefs.current.delete(group.id);
            }}
            id={`${idPrefix}-tab-${group.id}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={`${idPrefix}-panel-${group.id}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onSelect(group.id)}
            onKeyDown={(event) => {
              const previousKey = vertical ? "ArrowUp" : "ArrowLeft";
              const nextKey = vertical ? "ArrowDown" : "ArrowRight";
              let nextIndex = index;

              if (event.key === previousKey) {
                nextIndex = (index - 1 + groups.length) % groups.length;
              } else if (event.key === nextKey) {
                nextIndex = (index + 1) % groups.length;
              } else if (event.key === "Home") {
                nextIndex = 0;
              } else if (event.key === "End") {
                nextIndex = groups.length - 1;
              } else {
                return;
              }

              event.preventDefault();
              const nextGroup = groups[nextIndex];
              onSelect(nextGroup.id);
              requestAnimationFrame(() => {
                document
                  .getElementById(`${idPrefix}-tab-${nextGroup.id}`)
                  ?.focus();
              });
            }}
            className={
              vertical
                ? `flex min-h-11 w-full items-center justify-between rounded-xl px-3 text-left text-sm font-bold outline-none transition focus-visible:ring-4 focus-visible:ring-violet-100 ${
                    selected
                      ? "bg-violet-600 text-white"
                      : "text-slate-700 hover:bg-violet-50 hover:text-violet-800"
                  }`
                : `min-h-11 shrink-0 rounded-full border px-4 py-2 text-sm font-bold outline-none transition focus-visible:ring-4 focus-visible:ring-violet-100 ${
                    selected
                      ? "border-violet-600 bg-violet-600 text-white"
                      : "border-violet-100 bg-white text-slate-700 hover:border-violet-300 hover:text-violet-800"
                  }`
            }
          >
            {group.label}
          </button>
        );
      })}
    </div>
  );
}

export function HeaderClient({
  capabilities,
}: {
  readonly capabilities: PublicLaunchCapabilitySnapshot;
}) {
  const pathname = usePathname();
  const groups = useMemo(
    () => getToolDiscoveryGroups(capabilities),
    [capabilities],
  );
  const searchItems = useMemo(
    () => getHeaderToolSearchItems(capabilities),
    [capabilities],
  );
  const firstGroupId = groups[0]?.id ?? "edit-sign";
  const [selectedGroupId, setSelectedGroupId] =
    useState<ToolDiscoveryGroupId>(firstGroupId);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const toolsTriggerRef = useRef<HTMLButtonElement | null>(null);
  const toolsMenuRef = useRef<HTMLDivElement | null>(null);
  const desktopTabRefs = useRef(
    new Map<ToolDiscoveryGroupId, HTMLButtonElement>(),
  );
  const mobileTriggerRef = useRef<HTMLButtonElement | null>(null);
  const mobilePanelRef = useRef<HTMLDivElement | null>(null);

  const selectedGroup =
    groups.find((group) => group.id === selectedGroupId) ?? groups[0];

  useEffect(() => {
    setToolsOpen(false);
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!toolsOpen) return;

    function closeAndRestoreFocus() {
      setToolsOpen(false);
      toolsTriggerRef.current?.focus();
    }

    function handlePointerDown(event: MouseEvent) {
      if (
        event.target instanceof Node &&
        !toolsMenuRef.current?.contains(event.target) &&
        !toolsTriggerRef.current?.contains(event.target)
      ) {
        closeAndRestoreFocus();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeAndRestoreFocus();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [toolsOpen]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    if (mobileOpen) {
      requestAnimationFrame(() => {
        mobilePanelRef.current
          ?.querySelector<HTMLElement>("input, button, a[href]")
          ?.focus();
      });
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  function openToolsMenu() {
    setSelectedGroupId(firstGroupId);
    setToolsOpen(true);
    requestAnimationFrame(() => {
      desktopTabRefs.current.get(firstGroupId)?.focus();
    });
  }

  function closeToolsMenu() {
    setToolsOpen(false);
  }

  function handleMobileKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      setMobileOpen(false);
      mobileTriggerRef.current?.focus();
      return;
    }
    if (event.key !== "Tab") return;

    const focusable = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        'a[href], input:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    );
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border-light)] bg-white/96 backdrop-blur-xl">
      <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-[68px] items-center gap-3">
          <Link
            href="/"
            className="group flex min-w-0 shrink-0 items-center gap-2"
            aria-label="PDFMantra home"
          >
            <BrandMark className="h-9 w-9 shrink-0 transition group-hover:-translate-y-0.5" />
            <div className="min-w-0">
              <div className="display-font truncate text-xl font-bold leading-none tracking-[-0.04em] text-slate-950">
                PDFMantra
              </div>
              <div className="mt-1 hidden text-[8px] font-bold uppercase tracking-[0.18em] text-slate-500 sm:block">
                PDF command center
              </div>
            </div>
          </Link>

          <button
            ref={toolsTriggerRef}
            type="button"
            onClick={() => {
              if (toolsOpen) closeToolsMenu();
              else openToolsMenu();
            }}
            className="ml-3 hidden min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] font-bold text-slate-700 outline-none transition hover:bg-violet-50 hover:text-violet-700 focus-visible:ring-4 focus-visible:ring-violet-100 lg:inline-flex"
            aria-expanded={toolsOpen}
            aria-haspopup="dialog"
            aria-controls="header-tools-menu"
          >
            All PDF Tools
            <ChevronDown
              size={14}
              className={`transition ${toolsOpen ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          </button>

          <div className="hidden min-w-4 flex-1 lg:block" />

          <div className="hidden shrink-0 items-center gap-3 lg:flex">
            <HeaderToolSearch
              idPrefix="desktop-header-tool-search"
              items={searchItems}
              enableShortcut
            />
            <HeaderAuthLinks />
          </div>

          <button
            ref={mobileTriggerRef}
            type="button"
            onClick={() => setMobileOpen((current) => !current)}
            className="ml-auto inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-violet-100 bg-white text-slate-950 outline-none transition hover:border-violet-300 hover:text-violet-700 focus-visible:ring-4 focus-visible:ring-violet-100 lg:hidden"
            aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
          >
            {mobileOpen ? (
              <X size={20} aria-hidden="true" />
            ) : (
              <Menu size={21} aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {toolsOpen && selectedGroup ? (
        <div
          id="header-tools-menu"
          ref={toolsMenuRef}
          role="dialog"
          aria-label="All PDF tools"
          className="absolute inset-x-0 top-full hidden border-y border-[var(--border-light)] bg-white shadow-[0_20px_52px_rgba(36,25,86,0.11)] lg:block"
        >
          <div className="mx-auto grid max-h-[calc(100vh-90px)] max-w-[1320px] grid-cols-[220px_minmax(0,1fr)] gap-7 overflow-y-auto px-8 py-6">
            <CategoryTabs
              groups={groups}
              selectedId={selectedGroupId}
              orientation="vertical"
              idPrefix="desktop-tool-group"
              tabRefs={desktopTabRefs}
              onSelect={setSelectedGroupId}
            />

            <div
              id={`desktop-tool-group-panel-${selectedGroup.id}`}
              role="tabpanel"
              aria-labelledby={`desktop-tool-group-tab-${selectedGroup.id}`}
              className="min-w-0"
            >
              <div className="grid grid-cols-2 gap-1.5 xl:grid-cols-3">
                {selectedGroup.items.map((item) => (
                  <DiscoveryTool
                    key={item.tool.id}
                    item={item}
                    onNavigate={closeToolsMenu}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {mobileOpen && selectedGroup ? (
        <div
          id="mobile-navigation"
          ref={mobilePanelRef}
          role="dialog"
          aria-modal="true"
          aria-label="PDFMantra navigation"
          onKeyDown={handleMobileKeyDown}
          className="fixed inset-x-0 top-[69px] z-40 h-[calc(100dvh-69px)] overflow-y-auto border-t border-[var(--border-light)] bg-[#f8f7fb] px-4 py-5 lg:hidden"
        >
          <div className="mx-auto max-w-3xl pb-8">
            <HeaderToolSearch
              idPrefix="mobile-header-tool-search"
              items={searchItems}
              mobile
              onNavigate={() => setMobileOpen(false)}
            />

            <div className="mt-5">
              <CategoryTabs
                groups={groups}
                selectedId={selectedGroupId}
                orientation="horizontal"
                idPrefix="mobile-tool-group"
                onSelect={setSelectedGroupId}
              />
            </div>

            <div
              id={`mobile-tool-group-panel-${selectedGroup.id}`}
              role="tabpanel"
              aria-labelledby={`mobile-tool-group-tab-${selectedGroup.id}`}
              className="mt-3 rounded-2xl border border-violet-100 bg-white p-2"
            >
              <div className="grid gap-1 sm:grid-cols-2">
                {selectedGroup.items.map((item) => (
                  <DiscoveryTool
                    key={item.tool.id}
                    item={item}
                    onNavigate={() => setMobileOpen(false)}
                  />
                ))}
              </div>
            </div>

            <div className="mt-5 overflow-hidden rounded-2xl border border-violet-100 bg-white">
              <MobileHeaderAuthLink />
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
