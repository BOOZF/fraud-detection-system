import { AlertDetailView } from "@/components/AlertDetailView";
import { Page, PageTitle } from "@/components/PageShell";

export default async function AlertDetailPage({ params }: PageProps<"/alerts/[id]">) {
  const { id } = await params;
  return (
    <Page>
      <PageTitle eyebrow="Alert investigation" title={`Alert #${id}`}>
        Why it was flagged, what the SOP requires, and the SQL behind every number.
      </PageTitle>
      <AlertDetailView id={Number(id)} />
    </Page>
  );
}
