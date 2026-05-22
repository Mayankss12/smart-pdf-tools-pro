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
      <label htmlFor={name} className="mb-1.5 block text-sm font-semibold text-[var(--text-primary)]">
        {label}
        {optional ? (
          <span className="ml-1.5 text-xs font-normal text-[var(--text-muted)]">(optional)</span>
        ) : null}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        className={`w-full rounded-xl border bg-white px-3.5 py-3 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--violet-600)] focus:ring-2 focus:ring-[rgba(101,80,232,0.16)] ${
          error ? "border-red-300 ring-1 ring-red-200" : "border-[var(--border-light)]"
        }`}
      />
      {error ? <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p> : null}
    </div>
  );
}
