interface AuthInputProps {
  readonly name: string;
  readonly label: string;
  readonly type: string;
  readonly placeholder?: string;
  readonly autoComplete?: string;
  readonly required?: boolean;
  readonly optional?: boolean;
  readonly error?: string;
}

export function AuthInput({
  name,
  label,
  type,
  placeholder,
  autoComplete,
  required,
  optional,
  error,
}: AuthInputProps) {
  return (
    <div>
      <label htmlFor={name} className="mb-2 flex items-center justify-between gap-3 text-sm font-semibold text-[var(--text-primary)]">
        <span>{label}</span>
        {optional ? (
          <span className="rounded-full border border-violet-100 bg-violet-50 px-2.5 py-0.5 text-[11px] font-semibold text-[var(--text-muted)]">
            Optional
          </span>
        ) : null}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        className={`min-h-12 w-full rounded-2xl border bg-white px-4 py-3 text-sm font-medium text-[var(--text-primary)] outline-none transition placeholder:font-normal placeholder:text-[var(--text-muted)] focus:border-[var(--violet-600)] focus:ring-4 focus:ring-[rgba(101,80,232,0.16)] ${
          error ? "border-red-300 bg-red-50/30 ring-2 ring-red-100" : "border-[var(--border-light)] hover:border-violet-200"
        }`}
      />
      {error ? <p className="mt-2 text-xs font-semibold leading-5 text-red-600">{error}</p> : null}
    </div>
  );
}
