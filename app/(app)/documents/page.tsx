import { DocumentsView } from "@/components/documents/DocumentsView";
import { Page, PageTitle } from "@/components/PageShell";

export default function DocumentsPage() {
  return (
    <Page>
      <PageTitle eyebrow="Knowledge base" title="Documents">
        These are the policies the fraud copilot searches and cites. Upload an SOP, a procedure or a regulation and the
        copilot will ground its answers in it.
      </PageTitle>
      <DocumentsView />
    </Page>
  );
}
