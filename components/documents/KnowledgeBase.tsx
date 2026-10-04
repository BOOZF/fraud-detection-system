"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { TdBadge } from "@/components/TdBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deleteDocument, errorMessage } from "@/lib/api";
import type { DocumentInfo } from "@/lib/types";
import { formatBytes } from "./format";

interface Props {
  docs: DocumentInfo[] | null;
  error: string | null;
  onRetry: () => void;
  onDeleted: () => void;
}

export function KnowledgeBase({ docs, error, onRetry, onDeleted }: Props) {
  const [target, setTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function close() {
    if (deleting) return;
    setTarget(null);
    setDeleteError(null);
  }

  async function confirm() {
    if (!target) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteDocument(target);
      setTarget(null);
      onDeleted();
    } catch (e) {
      setDeleteError(errorMessage(e));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          Knowledge base <TdBadge />
        </CardTitle>
        <CardDescription>Chunks are embedded, stored and searched with vector search inside Teradata.</CardDescription>
      </CardHeader>
      <CardContent>
        {error ? (
          <div role="alert" className="flex flex-wrap items-center gap-3 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
            <span>Could not load documents: {error}</span>
            <Button type="button" size="sm" variant="outline" onClick={onRetry}>
              Retry
            </Button>
          </div>
        ) : docs === null ? (
          <div role="status" aria-label="Loading documents" className="space-y-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : docs.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No documents yet. Upload a policy to ground the copilot.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Pages</TableHead>
                <TableHead className="text-right">Chunks</TableHead>
                <TableHead className="text-right">Size</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead className="text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {docs.map((d) => (
                <TableRow key={d.doc}>
                  <TableCell className="font-medium">{d.doc}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{d.kind.toUpperCase()}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{d.pages ?? "-"}</TableCell>
                  <TableCell className="text-right">{d.chunks}</TableCell>
                  <TableCell className="text-right">{formatBytes(d.bytes)}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{d.uploaded_at}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      aria-label={`Delete ${d.doc}`}
                      onClick={() => setTarget(d.doc)}
                    >
                      <Trash2 aria-hidden className="size-4" />
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
    <Dialog open={target !== null} onOpenChange={(o) => !o && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete document</DialogTitle>
          <DialogDescription>Delete {target}? The copilot will stop citing it.</DialogDescription>
        </DialogHeader>
        {deleteError && (
          <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
            {deleteError}
          </p>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" disabled={deleting} onClick={close}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" disabled={deleting} onClick={confirm}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
