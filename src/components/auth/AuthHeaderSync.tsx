"use client";

import { useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

function setLink(link: HTMLAnchorElement, href: string, label: string) {
  link.href = href;
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

export function AuthHeaderSync() {
  useEffect(() => {
    let isMounted = true;
    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      syncHeaderAuthLinks(false);
      return () => {
        isMounted = false;
      };
    }

    supabase.auth.getSession().then(({ data }) => {
      if (isMounted) {
        syncHeaderAuthLinks(Boolean(data.session?.user));
      }
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) {
        syncHeaderAuthLinks(Boolean(session?.user));
      }
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return null;
}
