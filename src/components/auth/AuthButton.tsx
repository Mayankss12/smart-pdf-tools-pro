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
      aria-busy={isPending}
      className="inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-[14px] bg-[#5f4bc6] px-5 py-3 text-sm font-bold text-white shadow-[0_12px_28px_rgba(74,55,168,0.2)] outline-none transition hover:-translate-y-0.5 hover:bg-[#503db5] hover:shadow-[0_16px_32px_rgba(74,55,168,0.24)] focus-visible:ring-4 focus-visible:ring-violet-200 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 motion-reduce:transform-none motion-reduce:transition-none"
    >
      {isPending ? (
        <Loader2
          aria-hidden="true"
          className="animate-spin motion-reduce:animate-none"
          size={18}
        />
      ) : null}
      <span>{isPending ? pendingLabel : label}</span>
    </button>
  );
}
