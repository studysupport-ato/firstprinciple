import { redirect } from "next/navigation";

// Course materials open on the home page ("Tired of scrolling through WhatsApp…" and your courses).
export default function CourseMaterialsPage() {
  redirect("/#materials");
}
