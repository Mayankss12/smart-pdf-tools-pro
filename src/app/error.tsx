"use client";
import { useEffect } from "react";
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { void fetch("/api/telemetry", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventType: "client-error", route: window.location.pathname, errorName: error.name, errorMessage: error.message, errorDigest: error.digest }) }).catch(() => undefined); }, [error]);
  return <main className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-6 text-center"><h2 className="text-2xl font-bold text-slate-950">This screen could not finish</h2><p className="mt-3 text-sm leading-6 text-slate-600">Your local document was not uploaded. Retry the screen; if the problem continues, choose a fresh copy of the PDF.</p><button type="button" onClick={reset} className="mt-6 h-11 rounded-xl bg-violet-600 px-6 font-bold text-white">Try again</button></main>;
}
