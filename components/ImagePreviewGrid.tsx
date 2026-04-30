"use client";
export function ImagePreviewGrid({ files }: { files: File[] }) {
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{files.map((f)=>{const u=URL.createObjectURL(f);return <div key={f.name} className="rounded-xl border bg-slate-50 p-2"><img src={u} alt={f.name} className="h-36 w-full rounded object-cover"/><div className="mt-2 truncate text-xs font-semibold text-slate-600">{f.name}</div></div>;})}</div>;
}
