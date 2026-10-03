import { ArrowDown, ArrowRight, Bot, Cloud, Database, Globe2, LayoutDashboard, Server, Plug, type LucideIcon } from "lucide-react";
import { Fragment } from "react";
import { PageTitle } from "@/components/PageShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const FLOW: { name: string; note: string; icon: LucideIcon }[] = [
  { name: "Next.js", note: "UI, App Router. Renders results only.", icon: LayoutDashboard },
  { name: "FastAPI", note: "Thin API, no model logic.", icon: Server },
  { name: "Teradata", note: "XGBoost, XGBoostPredict, TD_VectorDistance", icon: Database },
  { name: "Pluggable LLM", note: "Hosted for the demo, local for sovereignty.", icon: Bot },
];

const ROWS = [
  ["Next.js 16 frontend", "Browser / app server", "Dashboard, alert queue, copilot chat. Renders results only."],
  ["FastAPI", "Bank-controlled VM or container", "Orchestrates SQL calls and prompt assembly. Holds no data at rest."],
  ["XGBoost (training)", "Inside Teradata", "Model trained where the data lives. Zero extraction of customer rows."],
  ["XGBoostPredict (scoring)", "Inside Teradata", "Fraud probability per transaction, re-scored on demand."],
  ["TD_VectorDistance (retrieval)", "Inside Teradata", "Nearest SOP chunks to the question, returned as citations."],
  ["LLM", "Pluggable endpoint", "Writes the answer from the retrieved SOP chunks. Only the prompt leaves the database."],
];

const PROD: { title: string; body: string; icon: LucideIcon }[] = [
  { title: "Teradata Cloud or Factory (on-prem)", body: "Run in a Malaysian region or in the bank's own data centre. Same SQL, same models.", icon: Cloud },
  { title: "Enterprise Vector Store", body: "Scale SOP and case-note retrieval beyond the PoC corpus with governed vector search.", icon: Database },
  { title: "MCP for agents", body: "Expose scoring and retrieval as governed tools so approved agents can act on alerts.", icon: Plug },
  { title: "Local LLM for sovereignty", body: "Point the same endpoint at an in-country model so no customer context leaves the bank.", icon: Globe2 },
];

export default function ArchitecturePage() {
  return (
    <>
      <section className="bg-background">
        <div className="mx-auto max-w-6xl space-y-8 px-4 py-12 sm:px-6">
          <PageTitle eyebrow="System design" title="What runs where">
            Scoring, retrieval and training stay inside Teradata. Only the final prompt reaches the LLM, and that
            endpoint is swappable.
          </PageTitle>
          <ol className="grid items-stretch gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr]">
            {FLOW.map(({ name, note, icon: Icon }, i) => (
              <Fragment key={name}>
                <li>
                  <Card className="h-full">
                    <CardHeader>
                      <Icon aria-hidden className="size-6 text-primary" />
                      <CardTitle className="text-lg">{name}</CardTitle>
                      <CardDescription>{note}</CardDescription>
                    </CardHeader>
                  </Card>
                </li>
                {i < FLOW.length - 1 && (
                  <li aria-hidden className="flex items-center justify-center text-muted-foreground">
                    <ArrowDown className="size-5 md:hidden" />
                    <ArrowRight className="hidden size-5 md:block" />
                  </li>
                )}
              </Fragment>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-muted/40">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight">What runs where</h2>
          <Card className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="p-3 font-medium">Component</th>
                  <th className="p-3 font-medium">Runs</th>
                  <th className="p-3 font-medium">Role</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map(([a, b, c]) => (
                  <tr key={a} className="border-b last:border-0">
                    <td className="p-3 font-medium">{a}</td>
                    <td className="p-3">{b}</td>
                    <td className="p-3 text-muted-foreground">{c}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      </section>

      <section className="bg-background">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Path to production</CardTitle>
              <CardDescription>
                From PoC to a sovereign deployment the bank can run, with no rewrite of the SQL or the application.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-4 sm:grid-cols-2">
                {PROD.map(({ title, body, icon: Icon }) => (
                  <li key={title} className="flex gap-3 rounded-lg border bg-muted/40 p-4">
                    <Icon aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
                    <div>
                      <p className="font-medium">{title}</p>
                      <p className="text-sm text-muted-foreground">{body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>
    </>
  );
}
