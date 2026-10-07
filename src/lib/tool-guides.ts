export type ToolGuide = {
  readonly toolId: string;
  readonly toolName: string;
  readonly href: string;
  readonly eyebrow: string;
  readonly title: string;
  readonly introduction: string;
  readonly steps: readonly string[];
  readonly example: string;
  readonly limitations: readonly string[];
  readonly faqs: readonly {
    readonly question: string;
    readonly answer: string;
  }[];
  readonly relatedTools: readonly {
    readonly label: string;
    readonly href: string;
  }[];
};

export const TOOL_GUIDES = {
  "merge-pdf": {
    toolId: "merge-pdf",
    toolName: "Merge PDF",
    href: "/tools/merge",
    eyebrow: "MERGE PDF GUIDE",
    title: "Combine PDFs in the order you choose",
    introduction:
      "Use Merge PDF when several complete documents need to become one file. PDFMantra keeps the source pages in the order shown in the queue and rebuilds them into a single downloadable PDF.",
    steps: [
      "Add two or more valid PDF files.",
      "Drag files or use the Up and Down controls to set the final order.",
      "Review the selected files, then merge and download the result.",
    ],
    example:
      "Example: place a cover sheet first, an invoice second and supporting receipts last to create one submission-ready document.",
    limitations: [
      "Encrypted PDFs must be unlocked with the correct password before merging.",
      "Merging preserves pages; it does not reconcile duplicate form-field names or rewrite page content.",
    ],
    faqs: [
      {
        question: "Does merging reduce PDF quality?",
        answer:
          "The merge engine copies the existing PDF pages rather than converting them to screenshots, so text and vector content are preserved where the source allows it.",
      },
      {
        question: "Can I change the file order before merging?",
        answer:
          "Yes. Reorder the queue before processing; the downloaded PDF follows that visible order.",
      },
    ],
    relatedTools: [
      { label: "Split PDF into separate files", href: "/tools/split" },
      { label: "Reorder PDF pages", href: "/tools/reorder" },
      { label: "Compress the merged PDF", href: "/tools/compress" },
    ],
  },
  "compress-pdf": {
    toolId: "compress-pdf",
    toolName: "Compress PDF",
    href: "/tools/compress",
    eyebrow: "COMPRESS PDF GUIDE",
    title: "Choose quality preservation or stronger size reduction",
    introduction:
      "PDFMantra offers two different compression approaches because one method cannot safely optimize every PDF. Structural compression prioritizes document features, while scan compression prioritizes a smaller visual file.",
    steps: [
      "Upload a valid PDF and inspect the available method descriptions.",
      "Use Structural Compression to preserve selectable text, links, vectors and forms.",
      "Use Scan Compression only when stronger reduction is worth flattening interactive content.",
    ],
    example:
      "Example: use Structural Compression for a digital contract; consider Balanced Scan Compression for a scanned packet that is too large to email.",
    limitations: [
      "A target size is a processing goal, not a guaranteed final file size.",
      "Scan compression can flatten selectable text, links, form fields and vector artwork.",
      "Already-optimized PDFs may show only a modest reduction.",
    ],
    faqs: [
      {
        question: "Which compression mode should I use first?",
        answer:
          "Start with Structural Compression for normal digital PDFs. Move to Scan Compression only when the result is still too large and a flattened visual copy is acceptable.",
      },
      {
        question: "Will compression change the page size?",
        answer:
          "Structural compression preserves page dimensions. Scan compression recreates the page visuals at the selected quality profile while retaining the page layout.",
      },
    ],
    relatedTools: [
      { label: "Merge PDF files", href: "/tools/merge" },
      { label: "Make a scanned PDF searchable", href: "/tools/ocr" },
      { label: "Convert PDF pages to images", href: "/tools/pdf-to-images" },
    ],
  },
  "pdf-to-searchable-pdf": {
    toolId: "pdf-to-searchable-pdf",
    toolName: "OCR PDF",
    href: "/tools/ocr",
    eyebrow: "SEARCHABLE PDF GUIDE",
    title: "Add a searchable text layer to scanned pages",
    introduction:
      "OCR reads text from page images and places an invisible searchable layer over the original PDF visuals. The result can be searched and selected while keeping the scanned page appearance.",
    steps: [
      "Upload a scanned or image-based PDF.",
      "Choose the document language, scan type and quality profile.",
      "Run OCR, review the confidence summary and download the searchable PDF.",
    ],
    example:
      "Example: turn a scanned invoice archive into PDFs that can be searched by supplier name, invoice number or item text.",
    limitations: [
      "Accuracy depends on resolution, contrast, page rotation, language and print quality.",
      "Handwriting, decorative fonts and complex tables may require manual review.",
      "OCR adds searchable text; it does not recreate the scan as an editable Word layout.",
    ],
    faqs: [
      {
        question: "Does OCR change the original page image?",
        answer:
          "The searchable-PDF workflow preserves the original page visuals and adds a text layer for search and selection.",
      },
      {
        question: "Which language should I select?",
        answer:
          "Choose the main language printed in the document. Auto mode is useful for mixed English and Hindi pages but requires a larger language download.",
      },
    ],
    relatedTools: [
      { label: "Convert PDF to editable Word", href: "/tools/pdf-to-word" },
      { label: "Compress a scanned PDF", href: "/tools/compress" },
      { label: "Edit a PDF online", href: "/editor" },
    ],
  },
  "pdf-to-word": {
    toolId: "pdf-to-word",
    toolName: "PDF to Word",
    href: "/tools/pdf-to-word",
    eyebrow: "PDF TO WORD GUIDE",
    title: "Create an editable Word document from PDF text",
    introduction:
      "PDFMantra extracts native PDF text page by page and can use OCR on scan-like pages. The resulting DOCX is designed for editing, not for pretending that every fixed PDF layout can be reconstructed perfectly.",
    steps: [
      "Upload a valid PDF and leave OCR enabled when the document contains scans.",
      "Choose the most relevant OCR language and quality setting.",
      "Convert, open the DOCX offline and review complex pages before editing or sharing.",
    ],
    example:
      "Example: convert a text-heavy report into editable Word paragraphs, then correct headings and spacing in Word before reuse.",
    limitations: [
      "Complex columns, tables, embedded fonts and exact visual positioning may shift.",
      "Scanned text depends on OCR accuracy and may contain recognition mistakes.",
      "PDF is a fixed-page format, while Word reflows content; identical pagination is not guaranteed.",
    ],
    faqs: [
      {
        question: "Is the converted Word text editable?",
        answer:
          "Yes. The DOCX uses editable paragraphs for extracted text. It is not a page-image-only document.",
      },
      {
        question: "Why can an invoice layout change in Word?",
        answer:
          "Invoices often use individually positioned text, lines and cells. Word uses flowing document structures, so complex PDF geometry cannot always map to identical editable Word elements.",
      },
    ],
    relatedTools: [
      { label: "Make a scanned PDF searchable", href: "/tools/ocr" },
      { label: "Edit a PDF online", href: "/editor" },
      { label: "Convert PDF pages to images", href: "/tools/pdf-to-images" },
    ],
  },
  "pdf-editor": {
    toolId: "pdf-editor",
    toolName: "PDF Editor",
    href: "/editor",
    eyebrow: "ONLINE PDF EDITOR GUIDE",
    title: "Add content without rebuilding the original PDF",
    introduction:
      "PDFMantra's editor places new text, images, signatures, highlights and whiteout objects over the existing page. This is useful for corrections, annotations and document completion while preserving the original page underneath.",
    steps: [
      "Open a PDF and choose the page you want to update.",
      "Select a tool, place the object on that page and adjust its size or position.",
      "Review every edited page at a readable zoom, then export and reopen the PDF before sharing it.",
    ],
    example:
      "Example: cover an outdated reference number with whiteout, add the corrected text above it and place an approval signature on the final page.",
    limitations: [
      "Added objects are overlays; existing embedded PDF text is not reflowed like text in a word processor.",
      "Whiteout visually covers content but is not a substitute for permanent redaction of sensitive data.",
      "Always inspect the exported PDF because uncommon fonts, rotations and page boxes can affect placement.",
    ],
    faqs: [
      {
        question: "Can I change text that is already inside the PDF?",
        answer:
          "The editor is designed for page overlays. You can cover existing text and add corrected text, but it does not reconstruct every PDF font and paragraph as editable source content.",
      },
      {
        question: "Does the editor work with scanned PDFs?",
        answer:
          "Yes for visual additions. If you also need searchable text, run OCR on the scan before or after editing and review the OCR result.",
      },
    ],
    relatedTools: [
      { label: "Fill and sign a PDF", href: "/tools/fill-sign" },
      { label: "Create fillable form fields", href: "/tools/form-creator" },
      { label: "Make scans searchable with OCR", href: "/tools/ocr" },
    ],
  },
  "split-pdf": {
    toolId: "split-pdf",
    toolName: "Split PDF",
    href: "/tools/split",
    eyebrow: "SPLIT PDF GUIDE",
    title: "Separate one PDF into precise page groups",
    introduction:
      "Split PDF lets you define page ranges and export each group as its own document. Visual previews help confirm the boundaries before multiple results are packaged for download.",
    steps: [
      "Upload one PDF and wait for the page previews to finish.",
      "Define the page groups or ranges that should become separate files.",
      "Check for missing or overlapping pages, then split and download the result.",
    ],
    example:
      "Example: split a 24-page monthly packet into pages 1-6, 7-12, 13-18 and 19-24 for four department files.",
    limitations: [
      "Splitting changes document boundaries; cross-document bookmarks and links may no longer point to the intended destination.",
      "Encrypted files must be unlocked with the correct password before page extraction.",
      "Large scans can take longer to preview because each page must be rendered.",
    ],
    faqs: [
      {
        question: "Can I create more than two PDF files?",
        answer:
          "Yes. Define multiple page groups; when there is more than one result, PDFMantra packages the outputs together for download.",
      },
      {
        question: "Can the same page appear in two outputs?",
        answer:
          "Use overlapping ranges only when you intentionally need a shared page, such as a common cover sheet. Review the group summary before processing.",
      },
    ],
    relatedTools: [
      { label: "Extract selected PDF pages", href: "/tools/extract" },
      { label: "Merge PDF files", href: "/tools/merge" },
      { label: "Reorder PDF pages", href: "/tools/reorder" },
    ],
  },
  "fill-sign": {
    toolId: "fill-sign",
    toolName: "Fill & Sign PDF",
    href: "/tools/fill-sign",
    eyebrow: "FILL AND SIGN PDF GUIDE",
    title: "Complete forms and place signatures page by page",
    introduction:
      "Use Fill & Sign for typed entries, dates, check marks and visual signatures. Every added object belongs to a specific PDF page, so review placement and size before exporting the completed copy.",
    steps: [
      "Upload the PDF and navigate to the page that needs an entry.",
      "Add text, a check mark or a saved, drawn or uploaded signature and position it on the page.",
      "Review the full document, export it and reopen the downloaded PDF to confirm every field.",
    ],
    example:
      "Example: enter a name and date on page one, add initials on page two and place an approval signature on the last page.",
    limitations: [
      "This creates a visual or form signature, not a certificate-backed cryptographic digital signature.",
      "Only use a signature that you are authorized to apply to the document.",
      "Complex dynamic XFA forms may not behave like standard PDF form fields after export.",
    ],
    faqs: [
      {
        question: "Can account members save more than one signature?",
        answer:
          "Signed-in members can keep multiple signature choices and select the appropriate one for each authorized document workflow.",
      },
      {
        question: "Can I use a signature image with a white background?",
        answer:
          "The upload workflow can prepare a transparent signature preview. Check the result against the document before placing it.",
      },
    ],
    relatedTools: [
      { label: "Edit a PDF online", href: "/editor" },
      { label: "Create a fillable PDF form", href: "/tools/form-creator" },
      { label: "Password protect the signed PDF", href: "/tools/protect" },
    ],
  },
  "pdf-to-images": {
    toolId: "pdf-to-images",
    toolName: "PDF to Images",
    href: "/tools/pdf-to-images",
    eyebrow: "PDF TO IMAGE GUIDE",
    title: "Export PDF pages as real image files",
    introduction:
      "Render selected PDF pages into JPG, PNG or WebP images. The format and resolution controls let you balance sharpness, transparency support and download size for the intended use.",
    steps: [
      "Upload a PDF and choose the pages that should become images.",
      "Select JPG, PNG or WebP and set a suitable resolution or quality level.",
      "Convert, inspect the image previews and download one file or the complete ZIP.",
    ],
    example:
      "Example: export a three-page product sheet as 150-DPI PNG images for a presentation, or as smaller JPG files for quick sharing.",
    limitations: [
      "Image output does not retain selectable text, hyperlinks, forms or PDF annotations as interactive elements.",
      "Higher resolution improves detail but increases processing time and file size.",
      "Very large pages may be capped by the browser's available memory and canvas limits.",
    ],
    faqs: [
      {
        question: "Which format should I choose?",
        answer:
          "Use PNG for diagrams and text-heavy pages, JPG for smaller photographic output, and WebP when the receiving application supports it.",
      },
      {
        question: "Why is a converted image not editable like the PDF?",
        answer:
          "The tool renders the complete page into pixels. Use PDF to Word when editable text is the main requirement.",
      },
    ],
    relatedTools: [
      { label: "Combine images into PDF", href: "/tools/images-to-pdf" },
      { label: "Convert PDF to editable Word", href: "/tools/pdf-to-word" },
      { label: "Compress a PDF", href: "/tools/compress" },
    ],
  },
  "images-to-pdf": {
    toolId: "images-to-pdf",
    toolName: "Images to PDF",
    href: "/tools/images-to-pdf",
    eyebrow: "IMAGES TO PDF GUIDE",
    title: "Combine photos and scans into an ordered PDF",
    introduction:
      "Images to PDF turns JPG, PNG and WebP files into PDF pages. Reorder the files first, then choose how each image should fit the page rather than accepting an accidental crop or stretch.",
    steps: [
      "Add supported images and arrange them in the final reading order.",
      "Choose page size, orientation, margins and image-fit behavior.",
      "Create the PDF, review the output and download the combined document.",
    ],
    example:
      "Example: photograph eight receipts, arrange them by date and create one A4 PDF with margins for an expense submission.",
    limitations: [
      "Text inside images remains image content unless OCR is run on the finished PDF.",
      "Upscaling a small source image cannot restore detail that was not captured originally.",
      "Transparent areas may be placed over the selected page background depending on the output settings.",
    ],
    faqs: [
      {
        question: "Can I mix JPG, PNG and WebP files?",
        answer:
          "Yes. The general Images to PDF workflow accepts supported image formats and places them into one ordered document.",
      },
      {
        question: "How do I make the final PDF searchable?",
        answer:
          "Create the PDF first, then use OCR PDF to add a searchable text layer to clear printed scans.",
      },
    ],
    relatedTools: [
      { label: "Convert JPG to PDF", href: "/tools/jpg-to-pdf" },
      { label: "Make the PDF searchable with OCR", href: "/tools/ocr" },
      { label: "Compress the finished PDF", href: "/tools/compress" },
    ],
  },
  "jpg-to-pdf": {
    toolId: "jpg-to-pdf",
    toolName: "JPG to PDF",
    href: "/tools/jpg-to-pdf",
    eyebrow: "JPG TO PDF GUIDE",
    title: "Turn JPG photos into one shareable PDF",
    introduction:
      "JPG to PDF is the focused image workflow for JPEG photos and scans. Arrange the images, choose the page layout and create a standard PDF that opens in common offline readers.",
    steps: [
      "Upload one or more JPG or JPEG files.",
      "Reorder the images and choose page size, orientation, margins and fit.",
      "Create and download the PDF, then open it once to check page order and clarity.",
    ],
    example:
      "Example: combine photographed identity-document pages into one correctly ordered PDF for an authorized application upload.",
    limitations: [
      "JPEG compression artifacts in the source remain visible in the PDF.",
      "The PDF contains page images, not selectable source text.",
      "Use only documents and images that you are permitted to process and share.",
    ],
    faqs: [
      {
        question: "Can I combine several JPG files into one PDF?",
        answer:
          "Yes. Add the images, arrange them in order and export one multi-page PDF.",
      },
      {
        question: "Will the PDF work offline?",
        answer:
          "The output is a standard PDF download and should open in normal offline PDF readers after it is saved successfully.",
      },
    ],
    relatedTools: [
      { label: "Combine mixed image formats", href: "/tools/images-to-pdf" },
      { label: "Make image text searchable", href: "/tools/ocr" },
      { label: "Compress the created PDF", href: "/tools/compress" },
    ],
  },
  "compare-pdf": {
    toolId: "compare-pdf",
    toolName: "Compare PDFs",
    href: "/tools/compare",
    eyebrow: "COMPARE PDF GUIDE",
    title: "Review text and visual changes between PDF versions",
    introduction:
      "Compare PDFs helps reviewers identify differences between two document versions. Use the text and visual views together because layout-only changes and wording changes do not always appear in the same way.",
    steps: [
      "Upload the earlier PDF as the first file and the revised PDF as the second.",
      "Run the comparison and review each flagged page in text and visual context.",
      "Confirm important changes against the original files before approval or archival.",
    ],
    example:
      "Example: compare a supplier contract draft with the signed version to identify changed clauses, missing pages or altered values.",
    limitations: [
      "Reflowed paragraphs, font substitutions and scan noise can create differences that require human review.",
      "A clean comparison does not prove a document's authenticity or digital-signature validity.",
      "Scanned documents may need OCR for a more useful text comparison.",
    ],
    faqs: [
      {
        question: "Does the comparison find visual changes?",
        answer:
          "It provides page-level visual and text comparison signals. Review both views for moved objects, wording changes and replaced pages.",
      },
      {
        question: "Why do identical-looking scans show differences?",
        answer:
          "Scanner noise, compression and slight page alignment changes can alter pixels even when the readable content appears similar.",
      },
    ],
    relatedTools: [
      { label: "Run OCR on scanned PDFs", href: "/tools/ocr" },
      { label: "Edit a PDF online", href: "/editor" },
      { label: "Protect an approved PDF", href: "/tools/protect" },
    ],
  },
  "form-creator": {
    toolId: "form-creator",
    toolName: "PDF Form Creator",
    href: "/tools/form-creator",
    eyebrow: "FILLABLE PDF FORM GUIDE",
    title: "Add real interactive fields to a PDF",
    introduction:
      "PDF Form Creator adds standard interactive fields such as text inputs, checkboxes, radio buttons and dropdowns. Each field is placed on a specific page and exported as part of the PDF form structure.",
    steps: [
      "Upload the source PDF and open the page where a response is needed.",
      "Add a field, set its label and options, then size and position it over the intended area.",
      "Preview all pages, export the form and test it in a second PDF reader before distribution.",
    ],
    example:
      "Example: add name and email text fields, a consent checkbox and a department dropdown to an existing application PDF.",
    limitations: [
      "Not every browser or PDF viewer handles advanced form behavior identically.",
      "The tool creates common AcroForm fields; it does not recreate proprietary XFA workflows.",
      "Field labels, tab order and required states should be tested for keyboard accessibility.",
    ],
    faqs: [
      {
        question: "Are the exported fields actually fillable?",
        answer:
          "Yes. The creator writes interactive PDF form fields rather than drawing only a visual box on the page.",
      },
      {
        question: "Why should I test the form in another reader?",
        answer:
          "PDF viewers vary. Testing confirms field placement, options, saving and keyboard order for the people who will complete the form.",
      },
    ],
    relatedTools: [
      { label: "Fill and sign a PDF", href: "/tools/fill-sign" },
      { label: "Edit a PDF online", href: "/editor" },
      { label: "Flatten a completed PDF", href: "/tools/flatten" },
    ],
  },
  "reorder-pages": {
    toolId: "reorder-pages",
    toolName: "Reorder PDF Pages",
    href: "/tools/reorder",
    eyebrow: "REORDER PDF GUIDE",
    title: "Put PDF pages into the correct sequence",
    introduction:
      "Reorder Pages changes the sequence of existing pages without turning them into screenshots. The visual page manager helps verify the new order before the document is rebuilt.",
    steps: [
      "Upload a PDF and wait for every page preview to load.",
      "Move pages into the required sequence and check page numbers against the previews.",
      "Export the reordered PDF and reopen it to verify the complete reading order.",
    ],
    example:
      "Example: move a misplaced cover page to the front and place an appendix after the final report page.",
    limitations: [
      "Changing page order can affect bookmarks, internal links and printed page references.",
      "Reordering does not change page-number text already printed on the page.",
      "Encrypted PDFs must be unlocked with authorization before pages can be reorganized.",
    ],
    faqs: [
      {
        question: "Does reordering reduce quality?",
        answer:
          "The workflow rearranges existing PDF pages rather than converting them into images, so normal page content is preserved.",
      },
      {
        question: "Can I also remove an unwanted page?",
        answer:
          "Use Delete Pages when a page should be removed, or Split PDF when you need several separate output documents.",
      },
    ],
    relatedTools: [
      { label: "Delete PDF pages", href: "/tools/delete-pages" },
      { label: "Rotate PDF pages", href: "/tools/rotate" },
      { label: "Merge PDF files", href: "/tools/merge" },
    ],
  },
  "rotate-pdf": {
    toolId: "rotate-pdf",
    toolName: "Rotate PDF",
    href: "/tools/rotate",
    eyebrow: "ROTATE PDF GUIDE",
    title: "Correct sideways or upside-down PDF pages",
    introduction:
      "Rotate PDF applies page rotation to selected pages or the whole document. Previewing the pages first avoids rotating pages that already have the correct orientation.",
    steps: [
      "Upload the PDF and inspect the page thumbnails.",
      "Select the affected pages and rotate them clockwise or counterclockwise as needed.",
      "Export and reopen the corrected PDF to confirm every page orientation.",
    ],
    example:
      "Example: rotate only pages 3 and 7 of a scanned packet while leaving the portrait cover and remaining pages unchanged.",
    limitations: [
      "Rotation changes page orientation; it does not deskew text captured at a slight scanner angle.",
      "Some scans contain pixels that are already rotated inside a normal page box and may need image-level correction.",
      "Check mixed portrait and landscape documents page by page before applying a document-wide rotation.",
    ],
    faqs: [
      {
        question: "Can I rotate just one page?",
        answer:
          "Yes. Select the individual page in the visual page manager before applying the rotation.",
      },
      {
        question: "Will rotating change the printed content?",
        answer:
          "The page orientation changes, but the page content is not intentionally rasterized or rewritten by the rotation operation.",
      },
    ],
    relatedTools: [
      { label: "Reorder PDF pages", href: "/tools/reorder" },
      { label: "Crop PDF page margins", href: "/tools/crop" },
      { label: "Delete unwanted pages", href: "/tools/delete-pages" },
    ],
  },
  "protect-pdf": {
    toolId: "protect-pdf",
    toolName: "Protect PDF",
    href: "/tools/protect",
    eyebrow: "PROTECT PDF GUIDE",
    title: "Encrypt a PDF before authorized sharing",
    introduction:
      "Protect PDF creates an encrypted copy with a password and document permissions. PDFMantra uses AES-256 encryption for this workflow and processes the file in the browser.",
    steps: [
      "Upload the PDF and enter a strong password that the intended recipient can receive securely.",
      "Choose the available permissions carefully and create the protected copy.",
      "Download the file and test the password in a separate PDF reader before sharing it.",
    ],
    example:
      "Example: protect a confidential report before sending it, then communicate the password through a different approved channel.",
    limitations: [
      "A forgotten encryption password cannot be recovered by PDFMantra.",
      "Viewer-enforced permissions can vary, while the password remains the main access control.",
      "Encryption does not replace access policies, secure transfer or recipient verification.",
    ],
    faqs: [
      {
        question: "What encryption does PDFMantra use?",
        answer:
          "The Protect PDF workflow creates an AES-256 encrypted PDF and verifies the output before presenting it for download.",
      },
      {
        question: "Can I remove the password later?",
        answer:
          "Yes, if you know the current password and are authorized to remove it, use Unlock PDF to create an unprotected copy.",
      },
    ],
    relatedTools: [
      { label: "Unlock an authorized PDF", href: "/tools/unlock" },
      { label: "Fill and sign a PDF", href: "/tools/fill-sign" },
      { label: "Edit PDF metadata", href: "/tools/metadata" },
    ],
  },
} satisfies Record<string, ToolGuide>;
