const PDFMANTRA_ANONYMOUS_ID_KEY = "pdfmantra_anonymous_id";

function createFallbackId() {
  return `anon_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

function createAnonymousId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `anon_${crypto.randomUUID()}`;
  }

  return createFallbackId();
}

export function isAnonymousId(value: string | null | undefined) {
  return typeof value === "string" && /^anon_[a-zA-Z0-9._-]+$/.test(value);
}

export function getAnonymousId() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const existingId = window.localStorage.getItem(PDFMANTRA_ANONYMOUS_ID_KEY);

    if (isAnonymousId(existingId)) {
      return existingId;
    }

    const nextId = createAnonymousId();

    window.localStorage.setItem(PDFMANTRA_ANONYMOUS_ID_KEY, nextId);

    return nextId;
  } catch {
    return null;
  }
}

export function peekAnonymousId() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const existingId = window.localStorage.getItem(PDFMANTRA_ANONYMOUS_ID_KEY);

    return isAnonymousId(existingId) ? existingId : null;
  } catch {
    return null;
  }
}

export function clearAnonymousId() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(PDFMANTRA_ANONYMOUS_ID_KEY);
  } catch {
    // Ignore storage failures. Some browsers or privacy modes can block storage.
  }
}

export { PDFMANTRA_ANONYMOUS_ID_KEY };
