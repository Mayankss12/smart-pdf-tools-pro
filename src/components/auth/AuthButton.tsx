import { Loader2 } from "lucide-react";

interface AuthButtonProps {
  readonly isPending: boolean;
  readonly label: string;
  readonly pendingLabel?: string;
}

export function AuthButton({ isPending, label, pendingLabel = "Please wait..." }: AuthButtonProps) {
  return (
    <button
      type="submit"
      disabled={isPending}
      className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--violet-600)] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_34px_rgba(101,80,232,0.18)] transition hover:bg-[var(--violet-500)] focus:outline-none focus:ring-4 focus:ring-[rgba(101,80,232,0.16)] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isPending ? <Loader2 className="animate-spin" size={18} /> : null}
      <span>{isPending ? pendingLabel : label}</span>
    </button>
  );
}
