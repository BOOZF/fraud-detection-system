import { AlertsTable } from "@/components/alerts/AlertsTable";
import { DashboardView } from "@/components/DashboardView";
import { Page } from "@/components/PageShell";

export default function DashboardPage() {
  return (
    <Page>
      <DashboardView />
      <section id="alerts" className="scroll-mt-20 space-y-4 rounded-2xl border bg-card p-5 shadow-sm">
        <h2 className="text-lg font-semibold tracking-tight">Alert queue</h2>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Highest model probability first. Priority 1 is a score of 90% or higher, Priority 2 is 80-89%. Click a
          probability to open the copilot brief for that alert.
        </p>
        <AlertsTable />
      </section>
    </Page>
  );
}
