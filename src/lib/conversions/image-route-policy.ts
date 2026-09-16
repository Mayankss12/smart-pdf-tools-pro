export type ImageRouteSource = "mixed" | "jpg" | "png" | "webp" | "heic";

export const MAX_IMAGE_QUEUE_COUNT = 80;

const ROUTE_EXTENSIONS: Readonly<
  Record<Exclude<ImageRouteSource, "mixed">, readonly string[]>
> = {
  jpg: [".jpg", ".jpeg"],
  png: [".png"],
  webp: [".webp"],
  heic: [".heic", ".heif"],
};

const ROUTE_MIME_TYPES: Readonly<
  Record<Exclude<ImageRouteSource, "mixed">, readonly string[]>
> = {
  jpg: ["image/jpeg"],
  png: ["image/png"],
  webp: ["image/webp"],
  heic: ["image/heic", "image/heif"],
};

function extensionOf(fileName: string) {
  const normalized = fileName.toLowerCase();
  const dot = normalized.lastIndexOf(".");
  return dot >= 0 ? normalized.slice(dot) : "";
}

export function fileMatchesImageRoute(
  file: File,
  source: ImageRouteSource,
) {
  if (source === "mixed") return true;
  const extensionMatches = ROUTE_EXTENSIONS[source].includes(
    extensionOf(file.name),
  );
  const mimeMatches =
    !file.type ||
    file.type === "application/octet-stream" ||
    ROUTE_MIME_TYPES[source].includes(file.type.toLowerCase());
  return extensionMatches && mimeMatches;
}

export function selectImageQueueCandidates({
  files,
  source,
  currentCount,
  maximumCount = MAX_IMAGE_QUEUE_COUNT,
}: {
  readonly files: readonly File[];
  readonly source: ImageRouteSource;
  readonly currentCount: number;
  readonly maximumCount?: number;
}) {
  const routeAccepted = files.filter((file) =>
    fileMatchesImageRoute(file, source),
  );
  const wrongFormatCount = files.length - routeAccepted.length;
  const safeMaximumCount = Math.min(
    MAX_IMAGE_QUEUE_COUNT,
    Math.max(1, Math.floor(maximumCount)),
  );
  const remainingCapacity = Math.max(0, safeMaximumCount - currentCount);
  const accepted = routeAccepted.slice(0, remainingCapacity);
  return {
    accepted,
    wrongFormatCount,
    queueLimitCount: routeAccepted.length - accepted.length,
    remainingCapacity,
  };
}
