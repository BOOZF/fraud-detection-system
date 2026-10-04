"use client";

import { FileUp, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { errorMessage, uploadDocument } from "@/lib/api";
import { cn } from "@/lib/utils";
import { formatBytes } from "./format";

const EXTENSIONS = [".pdf", ".md", ".txt"];
const MAX_BYTES = 25 * 1024 * 1024;

function validate(file: File): string | null {
  const name = file.name.toLowerCase();
  if (!EXTENSIONS.some((e) => name.endsWith(e))) return "Unsupported file type. Upload a .pdf, .md or .txt file.";
  if (file.size > MAX_BYTES) return "File is larger than 25 MB.";
  return null;
}

export function UploadCard({ onUploaded }: { onUploaded: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  function select(f: File | undefined) {
    if (!f || busy) return;
    setResult(null);
    const problem = validate(f);
    setError(problem);
    setFile(problem ? null : f);
  }

  async function upload() {
    if (!file || busy) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const info = await uploadDocument(file);
      setResult(
        info.pages != null
          ? `Indexed ${info.chunks} chunks from ${info.pages} pages`
          : `Indexed ${info.chunks} chunks`,
      );
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      onUploaded();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload a document</CardTitle>
        <CardDescription>
          PDF, Markdown or text, up to 25 MB. Uploading a file with the same name replaces the earlier version.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          data-testid="dropzone"
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            select(e.dataTransfer.files[0]);
          }}
          className={cn(
            "flex flex-col items-center gap-3 rounded-lg border-2 border-dashed p-8 text-center text-sm transition-colors",
            dragging ? "border-primary bg-primary/5" : "border-border bg-muted/30",
          )}
        >
          <FileUp aria-hidden className="size-8 text-muted-foreground" />
          <p className="text-muted-foreground">Drag and drop a file here, or</p>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.md,.txt"
            className="sr-only"
            tabIndex={-1}
            aria-label="Document file"
            onChange={(e) => select(e.target.files?.[0])}
          />
          <Button type="button" variant="outline" disabled={busy} onClick={() => inputRef.current?.click()}>
            Choose file
          </Button>
          {file && (
            <p className="font-medium">
              <span>{file.name}</span> <span className="text-muted-foreground">{formatBytes(file.size)}</span>
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" disabled={!file || busy} onClick={upload}>
            {busy ? <Loader2 aria-hidden className="mr-1.5 size-4 animate-spin" /> : null}
            {busy ? "Uploading..." : "Upload"}
          </Button>
          {busy && (
            <p className="text-sm text-muted-foreground">
              Uploading and indexing... large PDFs can take up to a minute
            </p>
          )}
        </div>

        {error && (
          <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
            {error}
          </p>
        )}
        {result && (
          <p role="status" className="rounded-md border bg-muted/50 p-3 text-sm">
            {result}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
