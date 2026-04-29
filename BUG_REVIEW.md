# UI / Logic Bug Review

Date: 2026-04-29
Scope: quick static review of the current Next.js app without broad rewrites.

## High-priority bugs

1. **Broken navigation: tool links point to routes that do not exist yet.**
   - `lib/tools.ts` defines routes like `/tools/pdf-to-images`, `/tools/images-to-pdf`, `/tools/protect`, and `/tools/fill-sign`.
   - Only `/tools/merge`, `/tools/split`, and `/tools/compress` actually exist in `app/tools/`.
   - Impact: users can click cards and hit 404 pages.

2. **PDF editor accepts only MIME type `application/pdf`, which can reject valid PDFs.**
   - In `handleFile`, file validation is `file.type !== "application/pdf"`.
   - Some browsers or drag/drop sources provide empty `file.type` even for valid PDFs.
   - Impact: valid documents can be incorrectly rejected.

3. **Text-layer drag affordance is too small and inconsistent.**
   - Text layers are movable only by a tiny 2px top strip (`h-2`), while highlight layers are draggable from anywhere.
   - Impact: poor UX and likely “can’t move text box” user confusion.

4. **Unused reset workflow (dead logic).**
   - `resetEditor()` is defined but never wired to UI.
   - Impact: stale code path and missing expected behavior if reset was intended.

## Medium-priority bugs / issues

5. **Unused import increases noise and suggests incomplete feature wiring.**
   - `RotateCcw` is imported but never used.

6. **`pdfDocRef` is typed as `any`.**
   - Reduces type safety around page rendering and can hide integration mistakes.

7. **Overlay geometry may not track wrapped text accurately on export.**
   - Export draws text at `y: pdfY + 5` using a single baseline draw call, while UI allows multiline textarea content.
   - Impact: exported text placement can diverge from what users see, especially with multiple lines.

8. **No cancelation/race handling while loading/rendering PDFs.**
   - Re-uploading quickly can race multiple async `handleFile`/`renderPage` calls.
   - Impact: stale preview/status in edge cases.

## Verification commands used

- `npx tsc --noEmit` (passes)
- `npm run -s build` (fails in this environment because Google Font fetch for `Inter` fails)

## Suggested next step

Address high-priority items first (route/link mismatch and file acceptance), then tune editor UX consistency for drag behavior.
