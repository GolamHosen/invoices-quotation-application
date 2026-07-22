# PDF Font Fix Plan

## Steps
- [x] Plan approved by user
- [x] **Step 1**: Fix `src/lib/pdf.ts` - Changed font from `Times` to `Roboto` (bundled with pdfmake's VFS) in both `generateQuotationPdf` and `generateInvoicePdf`
  - [x] Changed `fonts` object from `Times` → `Roboto` with proper Roboto font mappings
  - [x] Changed `defaultStyle.font` from `"Times"` to `"Roboto"`
- [x] **Step 2**: Run TypeScript check and verify build
- [x] **Step 3**: PDF generation should now work without font errors (Roboto is bundled in pdfmake's vfs_fonts.js)
