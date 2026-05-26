"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

function setLink(link: HTMLAnchorElement, href: string, label: string) {
  link.setAttribute("href", href);
  link.textContent = label;
}

function syncHeaderAuthLinks(isSignedIn: boolean) {
  const header = document.querySelector("header");

  if (!header) {
    return;
  }

  const links = Array.from(header.querySelectorAll<HTMLAnchorElement>("a"));

  const accountCandidates = links.filter((link) => {
    const label = link.textContent?.trim().toLowerCase() ?? "";
    return label === "my account" || label === "login";
  });

  const primaryCandidates = links.filter((link) => {
    const label = link.textContent?.trim().toLowerCase() ?? "";
    return label === "sign up" || label === "logout" || label === "login / sign up";
  });

  accountCandidates.forEach((link) => {
    setLink(link, isSignedIn ? "/dashboard" : "/login", isSignedIn ? "My Account" : "Login");
  });

  primaryCandidates.forEach((link) => {
    setLink(link, isSignedIn ? "/logout" : "/signup", isSignedIn ? "Logout" : "Sign up");
  });
}

function syncAfterRender(isSignedIn: boolean) {
  syncHeaderAuthLinks(isSignedIn);
  window.requestAnimationFrame(() => syncHeaderAuthLinks(isSignedIn));
  window.setTimeout(() => syncHeaderAuthLinks(isSignedIn), 120);
  window.setTimeout(() => syncHeaderAuthLinks(isSignedIn), 400);
  window.setTimeout(() => syncHeaderAuthLinks(isSignedIn), 900);
}

export function AuthHeaderSync() {
  const pathname = usePathname();
  const isSignedInRef = useRef(false);

  useEffect(() => {
    let isMounted = true;
    const supabase = createSupabaseBrowserClient();

    function updateSignedInState(isSignedIn: boolean) {
      if (!isMounted) {
        return;
      }

      isSignedInRef.current = isSignedIn;
      syncAfterRender(isSignedIn);
    }

    if (!supabase) {
      updateSignedInState(false);
      return () => {
        isMounted = false;
      };
    }

    supabase.auth.getSession().then(({ data }) => {
      updateSignedInState(Boolean(data.session?.user));
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      updateSignedInState(Boolean(session?.user));
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    syncAfterRender(isSignedInRef.current);
  }, [pathname]);

  return null;
}
