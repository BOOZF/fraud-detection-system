export function Footer() {
  return (
    <footer className="border-t bg-muted/40">
      <div className="mx-auto max-w-6xl space-y-1 px-4 py-8 text-sm text-muted-foreground sm:px-6">
        <p>
          Fictional bank and synthetic data for demonstration. Built with Teradata ClearScape Analytics, FastAPI and
          Next.js.
        </p>
        <p>
          Sovereign path: Teradata Cloud or Teradata Factory (on-prem) in Malaysia, with the LLM swappable to a local
          in-country model.
        </p>
      </div>
    </footer>
  );
}
