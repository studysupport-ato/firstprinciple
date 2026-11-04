import { redirect } from "next/navigation";

// Course materials now live on the home page ("Your courses"); videos live in the YouTube playlist section.
export default function CourseMaterialsPage() {
  redirect("/#materials");
}
