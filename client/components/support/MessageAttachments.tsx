"use client";

import { isVideoAttachment, type SupportAttachment } from "@/lib/supportChat";

interface MessageAttachmentsProps {
  attachments?: SupportAttachment[];
  onDarkBubble?: boolean;
}

export default function MessageAttachments({ attachments, onDarkBubble = false }: MessageAttachmentsProps) {
  if (!attachments?.length) return null;

  const filenameClass = onDarkBubble ? "text-white/70" : "text-gray-500";

  return (
    <div className={`space-y-2 ${attachments.length ? "mt-2" : ""}`}>
      {attachments.map((attachment, index) => {
        const isVideo = isVideoAttachment(attachment.contentType);

        return (
          <div key={`${attachment.url}-${index}`} className="overflow-hidden rounded-lg">
            {isVideo ? (
              <video
                src={attachment.url}
                controls
                className="max-h-48 w-full rounded-lg bg-black/10"
                preload="metadata"
              />
            ) : (
              <a href={attachment.url} target="_blank" rel="noopener noreferrer">
                <img
                  src={attachment.url}
                  alt={attachment.filename}
                  className="max-h-48 w-full rounded-lg object-cover"
                />
              </a>
            )}
            <p className={`text-[10px] mt-1 truncate ${filenameClass}`}>
              {attachment.filename}
            </p>
          </div>
        );
      })}
    </div>
  );
}
