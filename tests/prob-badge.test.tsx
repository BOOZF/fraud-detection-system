import { render, screen } from "@testing-library/react";
import { ProbBadge } from "@/components/ProbBadge";

it("formats 0.93 as 93%", () => {
  render(<ProbBadge prob={0.93} />);
  expect(screen.getByText("93%")).toBeInTheDocument();
});

it("labels 0.96 as Priority 1", () => {
  render(<ProbBadge prob={0.96} />);
  expect(screen.getByText("P1")).toBeInTheDocument();
  expect(screen.getByText("96%")).toBeInTheDocument();
});

it("labels 0.85 as Priority 2", () => {
  render(<ProbBadge prob={0.85} />);
  expect(screen.getByText("P2")).toBeInTheDocument();
});

it("shows no priority below 80%", () => {
  render(<ProbBadge prob={0.5} />);
  expect(screen.queryByText(/^P[12]$/)).not.toBeInTheDocument();
});
