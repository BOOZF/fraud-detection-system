import { AlertsTable } from "@/components/alerts/AlertsTable";
import { DashboardView } from "@/components/DashboardView";
import { Page, PageTitle } from "@/components/PageShell";

export default function DashboardPage() {
  return (
    <Page>
      <PageTitle eyebrow="Fraud operations" title="Fraud dashboard">
        Live from Teradata. Where is fraud concentrated, how good is the model, and can we re-score on demand?
      </PageTitle>
      <DashboardView />
      <section id="alerts" className="scroll-mt-20 space-y-4 border-t pt-8">
        <h2 className="text-2xl font-semibold tracking-tight">Alert queue</h2>
        <p className="max-w-3xl text-muted-foreground">
          Highest model probability first. Priority 1 is a score of 90% or higher, Priority 2 is 80-89%. Click a
          probability to open the copilot brief for that alert.
        </p>
        <AlertsTable />
      </section>
    </Page>
  );
}
