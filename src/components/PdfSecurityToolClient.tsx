"use client";

import {
  type DragEvent,
  type FormEvent,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  CheckCircle2,
  Download,
  Eye,
  EyeOff,
  FileKey2,
  FileLock2,
  Info,
  KeyRound,
  Loader2,
  Printer,
  ShieldCheck,
  StopCircle,
  Upload,
  X,
} from "lucide-react";

import { Header } from "@/components/Header";
import { useEntitlement } from "@/hooks/useEntitlement";
import { usePdfSecurity } from "@/hooks/usePdfSecurity";
import { readValidatedPdfBytes } from "@/lib/pdf-document-safety";
import { downloadBlob, formatFileSize } from "@/lib/pdf-engine";
import {
  getPasswordStrength,
  getPdfSecurityErrorMessage,
  hasPdfDigitalSignatureMarker,
  PDF_SECURITY_MAX_SIZE_MB,
  validatePdfSecurityFile,
  validateProtectPassword,
  type PdfSecurityMode,
  type PdfSecurityPermissions,
} from "@/lib/pdf-security";

type PdfSecurityToolClientProps = {
  readonly mode: PdfSecurityMode;
};

type CompletedResult = {
  readonly outputSize: number;
  readonly encryptionMethod: string | null;
};

const DEFAULT_PERMISSIONS: PdfSecurityPermissions = {
  allowPrinting: true,
  allowCopying: true,
  allowEditing: true,
};

const MODE_COPY = {
  protect: {
    eyebrow: "Local PDF security",
    title: "Protect PDF",
    description:
      "Add real AES-256 password encryption without uploading your document or password.",
    emptyTitle: "Drop a PDF to protect",
    emptyHelp: `PDF only · up to ${PDF_SECURITY_MAX_SIZE_MB} MB · processed on this device`,
    button: "Protect & Download",
    processing: "Protecting PDF",
    complete: "Protected PDF verified and downloaded.",
    icon: FileLock2,
  },
  unlock: {
    eyebrow: "Authorized password removal",
    title: "Unlock PDF",
    description:
      "Remove encryption from a PDF when you know the password and are authorized to access it.",
    emptyTitle: "Drop a protected PDF",
    emptyHelp: `PDF only · up to ${PDF_SECURITY_MAX_SIZE_MB} MB · no password cracking`,
    button: "Unlock & Download",
    processing: "Unlocking PDF",
    complete: "Unlocked PDF verified and downloaded.",
    icon: FileKey2,
  },
} as const;

function PermissionToggle({
  checked,
  label,
  description,
  icon,
  onChange,
  disabled,
}: {
  checked: boolean;
  label: string;
  description: string;
  icon: React.ReactNode;
  onChange: (checked: boolean) => void;
  disabled: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 transition hover:border-violet-200 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-violet-500">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        disabled={disabled}
        className="mt-1 h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
      />
      <span className="mt-0.5 text-violet-600">{icon}</span>
      <span>
        <span className="block text-sm font-bold text-slate-800">{label}</span>
        <span className="mt-0.5 block text-xs font-medium leading-5 text-slate-500">
          {description}
        </span>
      </span>
    </label>
  );
}

export function PdfSecurityToolClient({ mode }: PdfSecurityToolClientProps) {
  const copy = MODE_COPY[mode];
  const Icon = copy.icon;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [permissions, setPermissions] =
    useState<PdfSecurityPermissions>(DEFAULT_PERMISSIONS);
  const [authorized, setAuthorized] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [signatureAccepted, setSignatureAccepted] = useState(false);
  const [status, setStatus] = useState(
    mode === "protect"
      ? "Choose a PDF and set an open password."
      : "Choose an encrypted PDF and enter its known password.",
  );
  const [statusKind, setStatusKind] = useState<"idle" | "error" | "success">("idle");
  const [completed, setCompleted] = useState<CompletedResult | null>(null);

  const { recordExport } = useEntitlement();
  const { run, cancel, reset, isProcessing, progress } = usePdfSecurity();
  const strength = useMemo(() => getPasswordStrength(password), [password]);

  async function selectFile(selectedFile?: File) {
    if (!selectedFile || isProcessing) return;

    try {
      validatePdfSecurityFile(selectedFile);
      const bytes = await readValidatedPdfBytes(
        selectedFile,
        PDF_SECURITY_MAX_SIZE_MB,
      );
      const signed = hasPdfDigitalSignatureMarker(bytes);
      setFile(selectedFile);
      setPassword("");
      setConfirmPassword("");
      setShowPassword(false);
      setAuthorized(false);
      setPermissions(DEFAULT_PERMISSIONS);
      setHasSignature(signed);
      setSignatureAccepted(false);
      setCompleted(null);
      reset();
      setStatus(
        signed
          ? "Digital-signature data detected. Review the warning before processing."
          : `${selectedFile.name} is ready (${formatFileSize(selectedFile.size)}).`,
      );
      setStatusKind("idle");
    } catch (error) {
      setFile(null);
      setHasSignature(false);
      setSignatureAccepted(false);
      setCompleted(null);
      setStatus(getPdfSecurityErrorMessage(error, mode));
      setStatusKind("error");
    }
  }

  function clearFile() {
    if (isProcessing) cancel();
    setFile(null);
    setPassword("");
    setConfirmPassword("");
    setAuthorized(false);
    setHasSignature(false);
    setSignatureAccepted(false);
    setPermissions(DEFAULT_PERMISSIONS);
    setCompleted(null);
    reset();
    if (inputRef.current) inputRef.current.value = "";
    setStatus(
      mode === "protect"
        ? "Choose a PDF and set an open password."
        : "Choose an encrypted PDF and enter its known password.",
    );
    setStatusKind("idle");
  }

  function openFilePicker() {
    if (isProcessing || !inputRef.current) return;
    inputRef.current.value = "";
    inputRef.current.click();
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    void selectFile(event.dataTransfer.files?.[0]);
  }

  function updatePermission(
    key: keyof PdfSecurityPermissions,
    checked: boolean,
  ) {
    setPermissions((current) => ({ ...current, [key]: checked }));
    setCompleted(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || isProcessing) return;

    try {
      if (mode === "protect") {
        validateProtectPassword(password);
        if (password !== confirmPassword) {
          throw new Error("Password confirmation does not match.");
        }
      }

      if (mode === "unlock" && !authorized) {
        throw new Error(
          "Confirm that you own this PDF or are authorized to remove its password.",
        );
      }

      if (hasSignature && !signatureAccepted) {
        throw new Error(
          "Confirm that you understand existing digital signatures will no longer validate.",
        );
      }

      setCompleted(null);
      setStatusKind("idle");
      setStatus(copy.processing);
      const result = await run({ file, mode, password, permissions });
      setStatus("Checking export allowance…");

      const entitlement = await recordExport({
        toolKey: mode === "protect" ? "protect" : "unlock",
        exportKind: "clean",
      });

      if (!entitlement.allowed) {
        setStatus(
          entitlement.error ||
            `${entitlement.planLabel} clean export limit reached for today.`,
        );
        setStatusKind("error");
        return;
      }

      downloadBlob(result.blob, result.fileName);
      setCompleted({
        outputSize: result.outputSize,
        encryptionMethod: result.encryptionMethod,
      });
      setPassword("");
      setConfirmPassword("");
      setStatus(copy.complete);
      setStatusKind("success");
    } catch (error) {
      setStatus(getPdfSecurityErrorMessage(error, mode));
      setStatusKind("error");
    }
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-slate-50 text-slate-950">
        <section className="mx-auto max-w-6xl px-4 py-7 sm:px-6 lg:px-8 lg:py-10">
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(event) => void selectFile(event.target.files?.[0])}
          />

          <div className="mb-6 flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
              <Icon size={22} aria-hidden="true" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.15em] text-violet-700">
                {copy.eyebrow}
              </div>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                {copy.title}
              </h1>
              <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-600 sm:text-base">
                {copy.description}
              </p>
            </div>
          </div>

          <div
            onDrop={handleDrop}
            onDragOver={(event) => event.preventDefault()}
            className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_55px_rgba(15,23,42,0.07)]"
          >
            {!file ? (
              <button
                type="button"
                onClick={openFilePicker}
                className="flex min-h-[430px] w-full flex-col items-center justify-center bg-gradient-to-b from-violet-50/55 to-white px-6 text-center transition hover:from-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-500"
              >
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-[0_16px_35px_rgba(109,76,237,0.25)]">
                  <Upload size={27} aria-hidden="true" />
                </span>
                <span className="mt-6 text-xl font-bold text-slate-900">{copy.emptyTitle}</span>
                <span className="mt-2 text-sm font-medium text-slate-500">
                  Browse a file or drag and drop
                </span>
                <span className="mt-5 rounded-full border border-violet-100 bg-white px-4 py-2 text-xs font-bold text-slate-500 shadow-sm">
                  {copy.emptyHelp}
                </span>
              </button>
            ) : (
              <form onSubmit={handleSubmit} className="grid lg:grid-cols-[1.05fr_0.95fr]">
                <div className="border-b border-slate-200 p-5 sm:p-7 lg:border-b-0 lg:border-r">
                  <div className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="min-w-0">
                      <div className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                        Selected PDF
                      </div>
                      <div className="mt-1 truncate text-base font-bold text-slate-900">
                        {file.name}
                      </div>
                      <div className="mt-1 text-sm font-semibold text-slate-500">
                        {formatFileSize(file.size)} · processed locally
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={clearFile}
                      disabled={isProcessing}
                      aria-label="Remove selected PDF"
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                    >
                      <X size={17} aria-hidden="true" />
                    </button>
                  </div>

                  <div className="mt-6">
                    <div className="flex items-center justify-between gap-3">
                      <label htmlFor="pdf-security-password" className="text-sm font-bold text-slate-800">
                        {mode === "protect" ? "Open password" : "Current password"}
                      </label>
                      {mode === "protect" ? (
                        <span
                          className={`text-xs font-bold ${
                            strength.score === 3
                              ? "text-emerald-600"
                              : strength.score === 2
                                ? "text-amber-600"
                                : "text-slate-400"
                          }`}
                        >
                          {strength.label}
                        </span>
                      ) : null}
                    </div>
                    <div className="relative mt-2">
                      <KeyRound
                        size={17}
                        aria-hidden="true"
                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <input
                        id="pdf-security-password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(event) => {
                          setPassword(event.target.value);
                          setCompleted(null);
                        }}
                        autoComplete="off"
                        disabled={isProcessing}
                        placeholder={
                          mode === "protect"
                            ? "Use at least 8 characters"
                            : "Leave blank only if the PDF opens without one"
                        }
                        className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-11 pr-12 text-sm font-semibold text-slate-900 outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 disabled:opacity-50"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((current) => !current)}
                        disabled={isProcessing}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      >
                        {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                    <p className="mt-2 text-xs font-medium leading-5 text-slate-500">
                      {mode === "protect"
                        ? "PDFMantra never uploads, stores, or logs this password. Save it securely—we cannot recover it."
                        : "This tool does not guess, crack, or bypass unknown passwords."}
                    </p>
                  </div>

                  {mode === "protect" ? (
                    <div className="mt-5">
                      <label htmlFor="pdf-security-confirm" className="text-sm font-bold text-slate-800">
                        Confirm open password
                      </label>
                      <input
                        id="pdf-security-confirm"
                        type={showPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(event) => {
                          setConfirmPassword(event.target.value);
                          setCompleted(null);
                        }}
                        autoComplete="off"
                        disabled={isProcessing}
                        placeholder="Re-enter the open password"
                        className="mt-2 h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 disabled:opacity-50"
                      />
                    </div>
                  ) : (
                    <label className="mt-5 flex items-start gap-3 rounded-2xl border border-violet-100 bg-violet-50/60 p-4 text-sm font-semibold leading-6 text-slate-700">
                      <input
                        type="checkbox"
                        checked={authorized}
                        onChange={(event) => setAuthorized(event.target.checked)}
                        disabled={isProcessing}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                      />
                      I own this PDF or have permission to remove its password and usage restrictions.
                    </label>
                  )}

                  {hasSignature ? (
                    <label className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-900">
                      <input
                        type="checkbox"
                        checked={signatureAccepted}
                        onChange={(event) => setSignatureAccepted(event.target.checked)}
                        disabled={isProcessing}
                        className="mt-1 h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                      />
                      This file appears to contain a cryptographic digital signature. Rewriting its encryption will invalidate that signature. I understand and want to continue.
                    </label>
                  ) : null}
                </div>

                <aside className="bg-slate-50/65 p-5 sm:p-7">
                  {mode === "protect" ? (
                    <div>
                      <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                        <ShieldCheck size={17} className="text-violet-600" aria-hidden="true" />
                        Document permissions
                      </div>
                      <p className="mt-1 text-xs font-medium leading-5 text-slate-500">
                        PDF readers enforce these preferences. The open password still protects the document with AES-256.
                      </p>
                      <div className="mt-4 space-y-2">
                        <PermissionToggle
                          checked={permissions.allowPrinting}
                          label="Allow printing"
                          description="Permit full-quality printing."
                          icon={<Printer size={16} />}
                          onChange={(checked) => updatePermission("allowPrinting", checked)}
                          disabled={isProcessing}
                        />
                        <PermissionToggle
                          checked={permissions.allowCopying}
                          label="Allow copying"
                          description="Permit text and image extraction."
                          icon={<Download size={16} />}
                          onChange={(checked) => updatePermission("allowCopying", checked)}
                          disabled={isProcessing}
                        />
                        <PermissionToggle
                          checked={permissions.allowEditing}
                          label="Allow editing"
                          description="Permit document modifications in compatible readers."
                          icon={<FileKey2 size={16} />}
                          onChange={(checked) => updatePermission("allowEditing", checked)}
                          disabled={isProcessing}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                        <Info size={17} className="text-violet-600" aria-hidden="true" />
                        What this tool removes
                      </div>
                      <ul className="mt-3 space-y-2 text-sm font-medium leading-6 text-slate-600">
                        <li>• The password required to open the PDF</li>
                        <li>• Printing, copying, and editing restrictions</li>
                        <li>• The PDF encryption dictionary</li>
                      </ul>
                      <p className="mt-3 text-xs font-semibold leading-5 text-slate-500">
                        The document is rewritten locally. Existing certified signatures may no longer validate.
                      </p>
                    </div>
                  )}

                  {isProcessing ? (
                    <div className="mt-5 rounded-2xl border border-violet-200 bg-violet-50 p-4" aria-live="polite">
                      <div className="flex items-center justify-between gap-3 text-sm font-bold text-violet-800">
                        <span>{progress.message}</span>
                        <span>{progress.progress}%</span>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                        <div
                          className="h-full rounded-full bg-violet-600 transition-[width] duration-300 motion-reduce:transition-none"
                          style={{ width: `${progress.progress}%` }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={cancel}
                        className="mt-4 inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50"
                      >
                        <StopCircle size={15} />
                        Cancel
                      </button>
                    </div>
                  ) : null}

                  {completed ? (
                    <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
                      <div className="flex items-center gap-2 text-sm font-bold">
                        <CheckCircle2 size={17} aria-hidden="true" />
                        Verified output
                      </div>
                      <p className="mt-2 text-sm font-semibold">
                        {formatFileSize(completed.outputSize)}
                        {completed.encryptionMethod
                          ? ` · ${completed.encryptionMethod}`
                          : " · encryption removed"}
                      </p>
                    </div>
                  ) : null}

                  <button
                    type="submit"
                    disabled={!file || isProcessing}
                    className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-bold text-white shadow-[0_14px_30px_rgba(109,76,237,0.22)] transition hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {isProcessing ? (
                      <Loader2 size={18} className="animate-spin motion-reduce:animate-none" />
                    ) : (
                      <Download size={18} />
                    )}
                    {isProcessing ? `${copy.processing}…` : copy.button}
                  </button>

                  <button
                    type="button"
                    onClick={openFilePicker}
                    disabled={isProcessing}
                    className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 disabled:opacity-40"
                  >
                    <Upload size={16} />
                    Choose another PDF
                  </button>
                </aside>
              </form>
            )}
          </div>

          <div
            role={statusKind === "error" ? "alert" : "status"}
            aria-live="polite"
            className={`mt-4 rounded-xl border px-4 py-3 text-sm font-semibold leading-6 ${
              statusKind === "error"
                ? "border-red-200 bg-red-50 text-red-700"
                : statusKind === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-white text-slate-600"
            }`}
          >
            {status}
          </div>
        </section>
      </main>
    </>
  );
}
