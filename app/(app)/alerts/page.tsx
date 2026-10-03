import { redirect } from "next/navigation";

// The alert queue now lives inside the dashboard.
export default function AlertsRedirect() {
  redirect("/dashboard#alerts");
}
