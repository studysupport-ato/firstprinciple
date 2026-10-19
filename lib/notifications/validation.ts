export const ANNOUNCEMENT_TITLE_MAX_LENGTH = 120;
export const ANNOUNCEMENT_MESSAGE_MAX_LENGTH = 2000;

export type AnnouncementContent = {
  title: string;
  message: string;
};

export type AnnouncementValidationResult =
  | { ok: true; data: AnnouncementContent }
  | { ok: false; error: string };

export function validateAnnouncementContent(input: unknown): AnnouncementValidationResult {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Enter a title and message." };
  }

  const content = input as Record<string, unknown>;
  if (typeof content.title !== "string" || typeof content.message !== "string") {
    return { ok: false, error: "Enter a title and message." };
  }

  const title = content.title.trim();
  const message = content.message.trim();

  if (!title || !message) {
    return { ok: false, error: "Title and message cannot be empty." };
  }
  if (title.length > ANNOUNCEMENT_TITLE_MAX_LENGTH) {
    return { ok: false, error: `Title must be ${ANNOUNCEMENT_TITLE_MAX_LENGTH} characters or fewer.` };
  }
  if (message.length > ANNOUNCEMENT_MESSAGE_MAX_LENGTH) {
    return { ok: false, error: `Message must be ${ANNOUNCEMENT_MESSAGE_MAX_LENGTH} characters or fewer.` };
  }

  return { ok: true, data: { title, message } };
}
