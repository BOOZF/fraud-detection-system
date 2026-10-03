"use client";

import { useEffect, useState } from "react";
import { getModel } from "@/lib/api";
import { num } from "@/lib/format";
import type { ModelInfo } from "@/lib/types";

export function SuccessCriteria() {
  const [model, setModel] = useState<ModelInfo | null>(null);

  useEffect(() => {
    getModel().then(setModel).catch(() => setModel(null));
  }, []);

  const criteria = [
    {
      title: "Train and score on 200k+ transactions without exporting data",
      proof: model
        ? `${num(model.train_rows + model.test_rows)} rows trained and scored in Teradata, training took ${model.train_seconds.toFixed(1)} s`
        : "Live proof appears when the API is connected.",
    },
    {
      title: "Analyst gets an explainable reason for each alert",
      proof: "Reason codes and fraud probability on every alert page.",
    },
    {
      title: "GenAI answers grounded in bank policy with citations",
      proof: "The copilot cites SOP sections, for example [SOP 4.1].",
    },
    {
      title: "Copilot refuses out-of-scope questions",
      proof: "Safe refusal when the SOP does not cover the question.",
    },
    {
      title: "Deployable in-country (data sovereignty)",
      proof: "Teradata Cloud or Factory on-prem, with a local LLM option.",
    },
  ];

  return (
    <section id="criteria" className="border-b px-6 py-20 sm:px-10">
      <h2 className="sw-display text-[clamp(2.25rem,6vw,5rem)] uppercase">PoC success criteria</h2>
      <p className="sw-muted mt-4 max-w-xl text-lg">
        Five tests the bank set for the 4-week Teradata vs Databricks comparison, each answered by this working system.
      </p>
      <div className="mt-12 grid border-l border-t sm:grid-cols-2 lg:grid-cols-3">
        {criteria.map(({ title, proof }, i) => (
          <article key={title} className="sw-cell border-b border-r p-6 sm:p-8">
            <span className="sw-display block text-7xl">{String(i + 1).padStart(2, "0")}</span>
            <h3 className="mt-8 text-xl font-bold leading-tight">{title}</h3>
            <p className="sw-muted mt-3 text-sm">{proof}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
