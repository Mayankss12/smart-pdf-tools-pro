export const PROVIDER_REQUEST_LIMIT_BYTES = 55 * 1024 * 1024;
export const PROVIDER_MULTIPART_OVERHEAD_BYTES = 1024 * 1024;
export const PROVIDER_UPLOAD_FILE_LIMIT_BYTES =
  PROVIDER_REQUEST_LIMIT_BYTES - PROVIDER_MULTIPART_OVERHEAD_BYTES;

export function isWithinProviderUploadLimit(fileSize: number) {
  return (
    Number.isFinite(fileSize) &&
    fileSize >= 0 &&
    fileSize <= PROVIDER_UPLOAD_FILE_LIMIT_BYTES
  );
}
