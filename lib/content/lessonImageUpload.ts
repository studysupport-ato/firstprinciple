export const MAX_LESSON_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

export function validateLessonImageFile(file: Pick<File, "size" | "type">): string | null {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return "Only JPEG, PNG, and WebP images are supported.";
  }
  if (file.size <= 0) {
    return "Choose an image file larger than 0 bytes.";
  }
  if (file.size > MAX_LESSON_IMAGE_SIZE_BYTES) {
    return "Each image must be 10 MB or smaller.";
  }
  return null;
}
