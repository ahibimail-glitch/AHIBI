export interface SupportAttachment {
  url: string;
  filename: string;
  contentType: string;
}

export interface SupportMessage {
  _id?: string;
  sender: string;
  senderName: string;
  senderRole: "user" | "artist" | "admin";
  message: string;
  attachments?: SupportAttachment[];
  createdAt: string;
}

const IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE = 20 * 1024 * 1024;

export function isVideoAttachment(contentType: string) {
  return VIDEO_TYPES.includes(contentType);
}

export function validateSupportAttachment(file: File): string | null {
  const isImage = IMAGE_TYPES.includes(file.type);
  const isVideo = VIDEO_TYPES.includes(file.type);

  if (!isImage && !isVideo) {
    return "Only screenshots (JPEG, PNG, GIF, WebP) and short videos (MP4, WebM, MOV) are allowed.";
  }

  const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
  if (file.size > maxSize) {
    return `File is too large. Maximum size is ${Math.round(maxSize / 1024 / 1024)}MB.`;
  }

  return null;
}

export async function uploadSupportAttachment(file: File): Promise<SupportAttachment> {
  const validationError = validateSupportAttachment(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const isVideo = VIDEO_TYPES.includes(file.type);
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", "support-chat");
  formData.append("documentType", isVideo ? "video" : "image");

  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  const data = await response.json();
  if (!response.ok || !data?.success || !data?.url) {
    throw new Error(data?.error || "Failed to upload attachment.");
  }

  return {
    url: data.url,
    filename: file.name,
    contentType: file.type,
  };
}
