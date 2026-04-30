export function StatusCard({ status }: { status: string }) {
  return <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">{status}</div>;
}
