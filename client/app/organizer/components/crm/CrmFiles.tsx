"use client";

import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import { Download, Loader2, Pin, Trash2, Upload } from "lucide-react";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useEventDepartments } from "@/app/organizer/components/crm/useEventDepartments";
import { uploadEventCrmFile } from "@/lib/vercelBlob";

type EventFile = {
  id: string;
  name: string;
  storageUrl: string;
  storagePath: string;
  sizeBytes: number | null;
  mimeType: string;
  pinned: boolean;
  departmentId: string | null;
  departmentName: string | null;
  createdAt: string;
};

const selectClass =
  "mt-1 block w-full rounded-md border border-[#21262d] bg-[#0d1117] text-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#f97316]";

function formatFileSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageFile(file: EventFile) {
  if (file.mimeType?.startsWith("image/")) return true;
  return /\.(jpg|jpeg|png|gif|webp|svg|bmp|avif)$/i.test(file.name);
}

interface CrmFilesProps {
  eventId: string;
}

export default function CrmFiles({ eventId }: CrmFilesProps) {
  const { toast } = useToast();
  const { departments, loading: deptLoading, apiUrl, tokenName } = useEventDepartments({ eventId });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<EventFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dept, setDept] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = localStorage.getItem(tokenName);
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${apiUrl}/api/organizer/events/${eventId}/files`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to load files");
      }
      setFiles(data.data?.files || []);
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to load files",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [apiUrl, eventId, tokenName, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const blob = await uploadEventCrmFile(file, eventId);
      const token = localStorage.getItem(tokenName);

      const res = await fetch(`${apiUrl}/api/organizer/events/${eventId}/files`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: file.name,
          storageUrl: blob.url,
          storagePath: blob.pathname,
          sizeBytes: blob.size,
          mimeType: blob.contentType,
          departmentId: dept || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to save file");
      }

      toast({ title: "Uploaded", description: file.name });
      setDept("");
      await load();
    } catch (err) {
      toast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : "Failed to upload file",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const togglePin = async (file: EventFile) => {
    try {
      const token = localStorage.getItem(tokenName);
      const res = await fetch(`${apiUrl}/api/organizer/events/${eventId}/files/${file.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pinned: !file.pinned }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to update file");
      }
      await load();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to update file",
        variant: "destructive",
      });
    }
  };

  const remove = async (file: EventFile) => {
    if (!confirm(`Delete ${file.name}?`)) return;

    try {
      setDeletingId(file.id);
      const token = localStorage.getItem(tokenName);

      const res = await fetch(`${apiUrl}/api/organizer/events/${eventId}/files/${file.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to delete file");
      }

      const blobUrl = data.data?.storageUrl || file.storageUrl;
      if (blobUrl) {
        await fetch("/api/upload/blob", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: blobUrl }),
        }).catch(() => undefined);
      }

      toast({ title: "File removed", description: file.name });
      await load();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to delete file",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const download = (file: EventFile) => {
    window.open(file.storageUrl, "_blank", "noopener,noreferrer");
  };

  const imageFiles = files.filter(isImageFile);
  const otherFiles = files.filter((f) => !isImageFile(f));

  if (loading || deptLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[#f97316]" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Files</h1>
        <p className="text-sm text-[#8b949e] mt-1">
          Schedules, venue maps, contacts and operational documents.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4 rounded-xl border border-[#21262d] bg-[#131820] p-4 mb-6">
        <div className="min-w-[200px]">
          <Label htmlFor="file-dept" className="text-xs text-[#8b949e]">
            Assign to department (optional)
          </Label>
          <select
            id="file-dept"
            value={dept}
            onChange={(e) => setDept(e.target.value)}
            className={selectClass}
          >
            <option value="">All members</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-[#f97316] hover:bg-[#ea580c] disabled:opacity-60 px-4 py-2.5 text-sm font-semibold text-black transition-colors">
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {uploading ? "Uploading…" : "Upload file"}
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleUpload}
            disabled={uploading}
            className="hidden"
          />
        </label>
      </div>

      <div className="space-y-6">
        {files.length === 0 ? (
          <p className="text-sm text-[#8b949e]">No files yet.</p>
        ) : (
          <>
            {imageFiles.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-[#8b949e] mb-3">
                  Images
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {imageFiles.map((f) => (
                    <FileImageCard
                      key={f.id}
                      file={f}
                      deleting={deletingId === f.id}
                      onTogglePin={() => togglePin(f)}
                      onDownload={() => download(f)}
                      onRemove={() => remove(f)}
                      onView={() => download(f)}
                    />
                  ))}
                </div>
              </section>
            )}

            {otherFiles.length > 0 && (
              <section>
                {imageFiles.length > 0 && (
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-[#8b949e] mb-3">
                    Documents
                  </h2>
                )}
                <div className="space-y-2">
                  {otherFiles.map((f) => (
                    <FileListRow
                      key={f.id}
                      file={f}
                      deleting={deletingId === f.id}
                      onTogglePin={() => togglePin(f)}
                      onDownload={() => download(f)}
                      onRemove={() => remove(f)}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function FileImageCard({
  file,
  deleting,
  onTogglePin,
  onDownload,
  onRemove,
  onView,
}: {
  file: EventFile;
  deleting: boolean;
  onTogglePin: () => void;
  onDownload: () => void;
  onRemove: () => void;
  onView: () => void;
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-[#21262d] bg-[#131820]">
      <button
        type="button"
        onClick={onView}
        className="block w-full aspect-square overflow-hidden bg-[#0d1117]"
        title={file.name}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={file.storageUrl}
          alt={file.name}
          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
          loading="lazy"
        />
      </button>

      {file.pinned && (
        <span className="absolute top-2 left-2 rounded-full bg-[#131820]/90 p-1.5 text-[#f97316]">
          <Pin className="h-3.5 w-3.5" />
        </span>
      )}

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0b0e14] via-[#0b0e14]/90 to-transparent p-3 pt-8">
        <p className="text-xs font-medium text-white truncate">{file.name}</p>
        <p className="text-[10px] text-[#8b949e] truncate mt-0.5">
          {formatFileSize(file.sizeBytes)}
          {file.departmentName ? ` · ${file.departmentName}` : ""}
        </p>
      </div>

      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={onTogglePin}
          className="rounded-md bg-[#131820]/90 p-1.5 text-[#c9d1d9] hover:text-[#f97316]"
          title={file.pinned ? "Unpin" : "Pin"}
        >
          <Pin className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onDownload}
          className="rounded-md bg-[#131820]/90 p-1.5 text-[#c9d1d9] hover:text-white"
          title="Download"
        >
          <Download className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onRemove}
          disabled={deleting}
          className="rounded-md bg-[#131820]/90 p-1.5 text-[#c9d1d9] hover:text-red-400 disabled:opacity-50"
          title="Delete"
        >
          {deleting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}

function FileListRow({
  file,
  deleting,
  onTogglePin,
  onDownload,
  onRemove,
}: {
  file: EventFile;
  deleting: boolean;
  onTogglePin: () => void;
  onDownload: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="group flex items-center justify-between gap-3 rounded-xl border border-[#21262d] bg-[#131820] p-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {file.pinned && <Pin className="h-3.5 w-3.5 shrink-0 text-[#f97316]" />}
          <span className="font-medium text-white truncate">{file.name}</span>
        </div>
        <div className="text-xs text-[#8b949e] mt-0.5">
          {file.mimeType || "file"}
          {file.sizeBytes ? ` · ${formatFileSize(file.sizeBytes)}` : ""}
          {file.departmentName ? ` · ${file.departmentName}` : ""}
        </div>
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0">
        <button
          type="button"
          onClick={onTogglePin}
          className="rounded p-1.5 text-[#6e7681] hover:bg-[#1e2433] hover:text-[#f97316]"
          title={file.pinned ? "Unpin" : "Pin"}
        >
          <Pin className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onDownload}
          className="rounded p-1.5 text-[#6e7681] hover:bg-[#1e2433] hover:text-white"
          title="Download"
        >
          <Download className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onRemove}
          disabled={deleting}
          className="rounded p-1.5 text-[#6e7681] hover:bg-[#1e2433] hover:text-red-400 disabled:opacity-50"
          title="Delete"
        >
          {deleting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}
