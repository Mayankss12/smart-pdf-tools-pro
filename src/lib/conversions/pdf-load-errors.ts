export function getPdfDocumentLoadErrorMessage(error: unknown) {
  const name =
    error && typeof error === "object"
      ? Reflect.get(error, "name")
      : null;
  if (name === "PasswordException") {
    return "This PDF is encrypted. Remove its password before converting it to images.";
  }
  if (name === "InvalidPDFException" || name === "FormatError") {
    return "This PDF is damaged or invalid and could not be opened.";
  }
  return "Unable to open this PDF. It may be damaged, encrypted, or incomplete.";
}
