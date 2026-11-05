"use client";

import { useEffect } from "react";
import { adminTestHubDataAction } from "@/lib/courseReps/actions";
import { addAdminHubData } from "./useHub";

/** Admin only: adds the hidden Inter Science (test) programme to the student view. Renders nothing. */
export function AdminTestProgramme() {
  useEffect(() => {
    void adminTestHubDataAction().then((result) => {
      if (result.ok) addAdminHubData(result.data);
    });
  }, []);
  return null;
}
