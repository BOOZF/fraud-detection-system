export function LandingFooter() {
  return (
    <footer className="border-t px-6 py-14 sm:px-10">
      <p className="sw-display text-[clamp(2.5rem,7vw,6rem)] uppercase">Malaysia XX Bank</p>
      <div className="mt-10 grid gap-6 border-t pt-6 text-sm sm:grid-cols-2">
        <p className="sw-muted max-w-md">
          Fictional bank and synthetic data for demonstration. Built with Teradata ClearScape Analytics, FastAPI and
          Next.js.
        </p>
        <p className="sw-muted max-w-md">
          Sovereign path: Teradata Cloud or Teradata Factory (on-prem) in Malaysia, with the LLM swappable to a local
          in-country model.
        </p>
      </div>
    </footer>
  );
}
