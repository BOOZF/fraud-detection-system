const FLOW = [
  { name: "Next.js", note: "UI, App Router. Renders results only." },
  { name: "FastAPI", note: "Thin API, no model logic." },
  { name: "Teradata", note: "XGBoost, XGBoostPredict, TD_VectorDistance." },
  { name: "Pluggable LLM", note: "Hosted for the demo, local for sovereignty." },
];

const ROWS = [
  ["Next.js 16 frontend", "Browser / app server", "Dashboard, alert queue, copilot chat. Renders results only."],
  ["FastAPI", "Bank-controlled VM or container", "Orchestrates SQL calls and prompt assembly. Holds no data at rest."],
  ["XGBoost (training)", "Inside Teradata", "Model trained where the data lives. Zero extraction of customer rows."],
  ["XGBoostPredict (scoring)", "Inside Teradata", "Fraud probability per transaction, re-scored on demand."],
  ["TD_VectorDistance (retrieval)", "Inside Teradata", "Nearest SOP chunks to the question, returned as citations."],
  ["LLM", "Pluggable endpoint", "Writes the answer from the retrieved SOP chunks. Only the prompt leaves the database."],
];

const PROD = [
  { title: "Teradata Cloud or Factory (on-prem)", body: "Run in a Malaysian region or in the bank's own data centre. Same SQL, same models." },
  { title: "Enterprise Vector Store", body: "Scale SOP and case-note retrieval beyond the PoC corpus with governed vector search." },
  { title: "MCP for agents", body: "Expose scoring and retrieval as governed tools so approved agents can act on alerts." },
  { title: "Local LLM for sovereignty", body: "Point the same endpoint at an in-country model so no customer context leaves the bank." },
];

export function Architecture() {
  return (
    <section id="architecture" className="scroll-mt-4 border-b px-6 py-20 sm:px-10">
      <h2 className="sw-display text-[clamp(2.25rem,6vw,5rem)] uppercase">Architecture</h2>
      <p className="sw-muted mt-4 max-w-xl text-lg">
        Scoring, retrieval and training stay inside Teradata. Only the final prompt reaches the LLM, and that endpoint is
        swappable.
      </p>

      <ol aria-label="Request flow" className="mt-12 grid border-l border-t sm:grid-cols-2 lg:grid-cols-4">
        {FLOW.map(({ name, note }, i) => (
          <li key={name} className="sw-cell relative border-b border-r p-6 sm:p-8">
            <span className="sw-display block text-7xl">{String(i + 1).padStart(2, "0")}</span>
            <p className="mt-8 text-xl font-bold leading-tight">{name}</p>
            <p className="sw-muted mt-3 text-sm">{note}</p>
            {i < FLOW.length - 1 && (
              <span aria-hidden className="absolute right-4 top-4 hidden text-2xl font-bold lg:block">
                →
              </span>
            )}
          </li>
        ))}
      </ol>

      <h3 className="sw-display mt-20 text-[clamp(1.5rem,3.5vw,2.75rem)] uppercase">What runs where</h3>
      <div className="mt-8 overflow-x-auto border">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b text-xs font-bold uppercase tracking-widest">
              <th scope="col" className="p-4">Component</th>
              <th scope="col" className="p-4">Runs</th>
              <th scope="col" className="p-4">Role</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map(([component, runs, role]) => (
              <tr key={component} className="sw-cell border-b last:border-b-0">
                <th scope="row" className="p-4 font-bold">{component}</th>
                <td className="p-4">{runs}</td>
                <td className="sw-muted p-4">{role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="sw-display mt-20 text-[clamp(1.5rem,3.5vw,2.75rem)] uppercase">Path to production</h3>
      <p className="sw-muted mt-4 max-w-xl">
        From PoC to a sovereign deployment the bank can run, with no rewrite of the SQL or the application.
      </p>
      <ul className="mt-8 grid border-l border-t sm:grid-cols-2 lg:grid-cols-4">
        {PROD.map(({ title, body }) => (
          <li key={title} className="sw-cell border-b border-r p-6 sm:p-8">
            <p className="text-xl font-bold leading-tight">{title}</p>
            <p className="sw-muted mt-3 text-sm">{body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
