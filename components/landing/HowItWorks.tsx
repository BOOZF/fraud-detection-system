const STEPS = [
  {
    title: "Ingest and prepare in Teradata",
    body: "200,000 card transactions and the bank's Fraud Operations SOP live in one governed engine. Features are built with SQL, next to the data.",
  },
  {
    title: "Train and score in-database",
    body: "XGBoost trains and XGBoostPredict scores inside Teradata. No extracts, no copies, and every statement is auditable.",
  },
  {
    title: "Investigate with the policy-grounded copilot",
    body: "TD_VectorDistance retrieves the relevant passages of the uploaded policy PDF. The LLM answers with page citations you can open side by side, and says so when the policy does not cover a question.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-4 border-b px-6 py-20 sm:px-10">
      <h2 className="sw-display text-[clamp(2.25rem,6vw,5rem)] uppercase">How it works</h2>
      <p className="sw-muted mt-4 max-w-xl text-lg">One engine from raw data to an analyst decision.</p>
      <ol className="mt-12 grid border-l border-t md:grid-cols-3">
        {STEPS.map(({ title, body }, i) => (
          <li key={title} className="sw-cell border-b border-r p-6 sm:p-8">
            <span className="sw-display block text-7xl">{String(i + 1).padStart(2, "0")}</span>
            <p className="mt-8 text-xl font-bold leading-tight">{title}</p>
            <p className="sw-muted mt-3">{body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
