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

function desktopPanelClasses(groupId: ToolDiscoveryGroupId) {
  if (groupId === "edit-sign") return "left-0 w-[520px]";
  if (groupId === "organize") return "left-0 w-[500px]";
  if (groupId === "convert-from") {
    return "left-1/2 w-[620px] -translate-x-1/2";
  }
  if (groupId === "convert-to") return "right-0 w-[660px]";
  return "right-0 w-[380px]";
}

function desktopGridClasses(groupId: ToolDiscoveryGroupId) {
  if (groupId === "optimize-ocr") return "grid-cols-1";
  return "grid-cols-2";
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
  const [openGroupId, setOpenGroupId] =
    useState<ToolDiscoveryGroupId | null>(null);
  const [mobileGroupId, setMobileGroupId] =
    useState<ToolDiscoveryGroupId>(firstGroupId);
  const [mobileOpen, setMobileOpen] = useState(false);
  const desktopNavRef = useRef<HTMLElement | null>(null);
  const desktopTriggerRefs = useRef(
    new Map<ToolDiscoveryGroupId, HTMLButtonElement>(),
  );
  const mobileTriggerRef = useRef<HTMLButtonElement | null>(null);
  const mobilePanelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setOpenGroupId(null);
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!openGroupId) return;

    function closeAndRestoreFocus() {
      const currentGroupId = openGroupId;
      setOpenGroupId(null);
      desktopTriggerRefs.current.get(currentGroupId)?.focus();
    }

    function handlePointerDown(event: MouseEvent) {
      if (
        event.target instanceof Node &&
        !desktopNavRef.current?.contains(event.target)
      ) {
        setOpenGroupId(null);
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
  }, [openGroupId]);

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

  function focusDesktopTrigger(index: number) {
    const group = groups[index];
    if (!group) return;
    desktopTriggerRefs.current.get(group.id)?.focus();
  }

  function openDesktopGroup(groupId: ToolDiscoveryGroupId, focusFirst = false) {
    setOpenGroupId(groupId);
    if (focusFirst) {
      requestAnimationFrame(() => {
        document
          .getElementById(`header-tool-menu-${groupId}`)
          ?.querySelector<HTMLElement>('a[href]')
          ?.focus();
      });
    }
  }

  function handleDesktopTriggerKeyDown(
    event: React.KeyboardEvent<HTMLButtonElement>,
    group: ToolDiscoveryGroup,
    index: number,
  ) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      focusDesktopTrigger((index + 1) % groups.length);
      return;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusDesktopTrigger((index - 1 + groups.length) % groups.length);
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      focusDesktopTrigger(0);
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      focusDesktopTrigger(groups.length - 1);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      openDesktopGroup(group.id, true);
    }
  }

  function handleDesktopPanelKeyDown(
    event: React.KeyboardEvent<HTMLDivElement>,
    groupId: ToolDiscoveryGroupId,
  ) {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpenGroupId(null);
      desktopTriggerRefs.current.get(groupId)?.focus();
      return;
    }

    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      return;
    }

    const links = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>('a[href]'),
    );
    if (!links.length) return;

    const currentIndex = links.indexOf(document.activeElement as HTMLElement);
    let nextIndex = currentIndex;
    if (event.key === "ArrowDown") {
      nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % links.length;
    } else if (event.key === "ArrowUp") {
      nextIndex = currentIndex < 0
        ? links.length - 1
        : (currentIndex - 1 + links.length) % links.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = links.length - 1;
    }

    event.preventDefault();
    links[nextIndex]?.focus();
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
        <div className="flex min-h-[68px] items-center gap-2">
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

          <nav
            ref={desktopNavRef}
            aria-label="PDF tool categories"
            className="ml-3 hidden min-w-0 shrink-0 items-center gap-0.5 xl:flex"
          >
            {groups.map((group, index) => {
              const open = openGroupId === group.id;
              return (
                <div key={group.id} className="relative">
                  <button
                    ref={(node) => {
                      if (node) desktopTriggerRefs.current.set(group.id, node);
                      else desktopTriggerRefs.current.delete(group.id);
                    }}
                    type="button"
                    onClick={() => {
                      setOpenGroupId((current) =>
                        current === group.id ? null : group.id,
                      );
                    }}
                    onKeyDown={(event) =>
                      handleDesktopTriggerKeyDown(event, group, index)
                    }
                    className="inline-flex min-h-11 items-center gap-1 rounded-full px-2.5 text-[12px] font-bold text-slate-700 outline-none transition hover:bg-violet-50 hover:text-violet-700 focus-visible:ring-4 focus-visible:ring-violet-100"
                    aria-expanded={open}
                    aria-controls={`header-tool-menu-${group.id}`}
                  >
                    {group.label}
                    <ChevronDown
                      size={13}
                      className={`transition ${open ? "rotate-180" : ""}`}
                      aria-hidden="true"
                    />
                  </button>

                  {open ? (
                    <div
                      id={`header-tool-menu-${group.id}`}
                      role="region"
                      aria-label={`${group.label} tools`}
                      onKeyDown={(event) =>
                        handleDesktopPanelKeyDown(event, group.id)
                      }
                      className={`absolute top-[calc(100%+12px)] z-50 rounded-2xl border border-violet-100 bg-white p-3 shadow-[0_20px_52px_rgba(36,25,86,0.13)] ${desktopPanelClasses(group.id)}`}
                    >
                      <div className={`grid gap-1.5 ${desktopGridClasses(group.id)}`}>
                        {group.items.map((item) => (
                          <DiscoveryTool
                            key={item.tool.id}
                            item={item}
                            onNavigate={() => setOpenGroupId(null)}
                          />
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </nav>

          <div className="hidden min-w-3 flex-1 xl:block" />

          <div className="hidden shrink-0 items-center gap-2 xl:flex">
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
            onClick={() => {
              setMobileOpen((current) => {
                const next = !current;
                if (next) setMobileGroupId(firstGroupId);
                return next;
              });
            }}
            className="ml-auto inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-violet-100 bg-white text-slate-950 outline-none transition hover:border-violet-300 hover:text-violet-700 focus-visible:ring-4 focus-visible:ring-violet-100 xl:hidden"
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

      {mobileOpen ? (
        <div
          id="mobile-navigation"
          ref={mobilePanelRef}
          role="dialog"
          aria-modal="true"
          aria-label="PDFMantra navigation"
          onKeyDown={handleMobileKeyDown}
          className="fixed inset-x-0 top-[69px] z-40 h-[calc(100dvh-69px)] overflow-y-auto border-t border-[var(--border-light)] bg-[#f8f7fb] px-4 py-5 xl:hidden"
        >
          <div className="mx-auto max-w-3xl pb-8">
            <HeaderToolSearch
              idPrefix="mobile-header-tool-search"
              items={searchItems}
              mobile
              onNavigate={() => setMobileOpen(false)}
            />

            <div className="mt-5 space-y-2">
              {groups.map((group) => {
                const expanded = mobileGroupId === group.id;
                return (
                  <section
                    key={group.id}
                    className="overflow-hidden rounded-2xl border border-violet-100 bg-white"
                  >
                    <button
                      type="button"
                      onClick={() => setMobileGroupId(group.id)}
                      className="flex min-h-14 w-full items-center justify-between px-4 text-left text-sm font-bold text-slate-900 outline-none transition hover:bg-violet-50 hover:text-violet-800 focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-violet-100"
                      aria-expanded={expanded}
                      aria-controls={`mobile-tool-group-${group.id}`}
                    >
                      {group.label}
                      <ChevronDown
                        size={16}
                        className={`transition ${expanded ? "rotate-180" : ""}`}
                        aria-hidden="true"
                      />
                    </button>

                    {expanded ? (
                      <div
                        id={`mobile-tool-group-${group.id}`}
                        className="border-t border-violet-100 p-2"
                      >
                        <div className="grid gap-1 sm:grid-cols-2">
                          {group.items.map((item) => (
                            <DiscoveryTool
                              key={item.tool.id}
                              item={item}
                              onNavigate={() => setMobileOpen(false)}
                            />
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </section>
                );
              })}
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
