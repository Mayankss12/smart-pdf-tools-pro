"use client";
export function SortableFileList({ files, setFiles }: { files: File[]; setFiles: (f: File[]) => void }) {
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir; if (j < 0 || j >= files.length) return;
    const copy = [...files]; [copy[i], copy[j]] = [copy[j], copy[i]]; setFiles(copy);
  };
  return <div className="space-y-2">{files.map((f,i)=><div key={`${f.name}-${i}`} className="flex items-center gap-2 rounded-xl border p-2"><span className="w-6 text-center text-xs font-black">{i+1}</span><div className="flex-1 truncate text-sm">{f.name}</div><button onClick={()=>move(i,-1)} className="rounded border px-2">↑</button><button onClick={()=>move(i,1)} className="rounded border px-2">↓</button><button onClick={()=>setFiles(files.filter((_,idx)=>idx!==i))} className="rounded border px-2 text-red-600">Remove</button></div>)}</div>;
}
