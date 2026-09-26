"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export default function PdfReader({
  slug,
  title,
  pageCount,
  downloadEnabled,
  startPage,
}: {
  slug: string;
  title: string;
  pageCount: number;
  downloadEnabled: boolean;
  startPage: number;
}) {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [ebookId, setEbookId] = useState<string | null>(null);
  const [pageNumber, setPageNumber] = useState(startPage || 1);
  const [scale, setScale] = useState(1.1);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadFile = useCallback(async () => {
    const tokenRes = await fetch(`/api/ebooks/${slug}/access-token`);
    if (!tokenRes.ok) {
      const json = await tokenRes.json();
      setError(json.error ?? "Unable to open this book.");
      return;
    }
    const data = await tokenRes.json();
    setEbookId(data.ebookId);
    // mode "redirect" (S3): the URL IS the presigned, ready-to-fetch link.
    // mode "proxy" (local dev): we still go through our own /file route.
    setFileUrl(data.mode === "redirect" ? data.url : `/api/ebooks/${slug}/file?token=${data.token}`);
  }, [slug]);

  useEffect(() => {
    loadFile();
  }, [loadFile]);

  useEffect(() => {
    if (!ebookId) return; // don't save until we know the real DB id
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      fetch("/api/reading-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ebookId,
          lastPage: pageNumber,
          percent: Math.round((pageNumber / pageCount) * 100),
        }),
      }).catch(() => {});
    }, 800);
  }, [pageNumber, ebookId, pageCount]);

  function toggleFullscreen() {
    if (!containerRef.current) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else containerRef.current.requestFullscreen();
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
        <h1 className="truncate text-sm font-semibold">{title}</h1>
        <div className="flex items-center gap-2 text-sm">
          <button onClick={() => setScale((s) => Math.max(0.6, s - 0.1))} className="rounded-md border px-2 py-1">
            −
          </button>
          <span className="w-12 text-center">{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale((s) => Math.min(2.5, s + 0.1))} className="rounded-md border px-2 py-1">
            +
          </button>
          <button onClick={toggleFullscreen} className="rounded-md border px-3 py-1">
            Fullscreen
          </button>
          {downloadEnabled && fileUrl && (
            <a href={fileUrl} download className="rounded-md border px-3 py-1">
              Download
            </a>
          )}
        </div>
      </div>

      <div ref={containerRef} className="flex flex-1 flex-col items-center overflow-auto py-6">
        {error && <p className="text-red-600">{error}</p>}
        {!error && !fileUrl && <p className="text-gray-500">Loading…</p>}
        {fileUrl && (
          <Document file={fileUrl} onLoadError={() => setError("Couldn't load this PDF.")}>
            <Page pageNumber={pageNumber} scale={scale} renderTextLayer renderAnnotationLayer />
          </Document>
        )}
      </div>

      <div className="flex items-center justify-center gap-4 border-t border-gray-200 bg-white px-4 py-3">
        <button
          onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
          disabled={pageNumber <= 1}
          className="rounded-md border px-4 py-2 text-sm disabled:opacity-40"
        >
          Previous
        </button>
        <span className="text-sm">
          Page {pageNumber} of {pageCount}
        </span>
        <button
          onClick={() => setPageNumber((p) => Math.min(pageCount, p + 1))}
          disabled={pageNumber >= pageCount}
          className="rounded-md border px-4 py-2 text-sm disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
