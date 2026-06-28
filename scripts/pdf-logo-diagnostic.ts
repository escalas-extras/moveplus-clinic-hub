/**
 * Diagnóstico do pipeline de logo nos PDFs.
 * Execução: npx tsx scripts/pdf-logo-diagnostic.ts
 */
console.log("=== PDF Logo Diagnostic ===\n");
console.log("Pipeline em produção (browser):");
console.log("  clinic_settings.logo_url");
console.log("    → loadClinicLogo() [pdf.ts]");
console.log("      → urlToDataUrl(signed URL)");
console.log("      → prepareLogoForPdf(raw) → normalizeLogoDataUrl (canvas)");
console.log("    → renderPdf() [render.ts]");
console.log("      → PreparedLogo ou prepareLogoForPdf (se string)");
console.log("      → drawDocumentHeader → drawLogoOrFallback → drawContainedImage");
console.log("        → addImage PNG, compressão NONE");
console.log("\nPipeline fixtures (Node):");
console.log("  normalizeLogoDataUrl → null (sem canvas) → monograma no PDF");
console.log("\nCausa raiz do fundo preto (corrigida):");
console.log("  1. Matte preto no arquivo + remoção insuficiente (cantos brancos)");
console.log("  2. Fallback embedando logo original (JPEG/PNG bruto)");
console.log("  3. Alpha fringe RGB preto em pixels transparentes");
console.log("\nVer: docs/auditorias/investigacao-logo-pdf.md");
