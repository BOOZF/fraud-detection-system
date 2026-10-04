"use client";

import { useCallback, useEffect, useState } from "react";
import { getDocuments, errorMessage } from "@/lib/api";
import type { DocumentInfo } from "@/lib/types";
import { KnowledgeBase } from "./KnowledgeBase";
import { UploadCard } from "./UploadCard";

export function DocumentsView() {
  const [docs, setDocs] = useState<DocumentInfo[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setDocs(await getDocuments());
    } catch (e) {
      setError(errorMessage(e));
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <UploadCard onUploaded={load} />
      <KnowledgeBase docs={docs} error={error} onRetry={load} onDeleted={load} />
    </div>
  );
}
