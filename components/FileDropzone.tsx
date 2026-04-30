"use client";

export function FileDropzone({ label, accept, multiple, onFiles }: { label: string; accept: string; multiple?: boolean; onFiles: (files: File[]) => void }) {
  return (
    <label className="block cursor-pointer rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/40 p-6 text-center">
      <div className="font-bold text-slate-900">{label}</div>
      <div className="mt-1 text-sm text-slate-500">Click to choose file{multiple ? "s" : ""}</div>
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => onFiles(Array.from(e.target.files || []))}
      />
    </label>
  );
}
