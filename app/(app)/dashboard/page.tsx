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
          Triage by model probability per SOP 4.1: Priority 1 (90% or higher) within 15 minutes, Priority 2 (80-89%)
          within 2 hours. Highest risk first.
        </p>
        <AlertsTable />
      </section>
    </Page>
  );
}
