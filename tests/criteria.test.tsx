import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

const getModel = vi.fn();
vi.mock("@/lib/api", () => ({ getModel: (...a: unknown[]) => getModel(...a) }));

import { SuccessCriteria } from "@/components/landing/SuccessCriteria";

it("shows the five criteria and the training proof from /api/model", async () => {
  getModel.mockResolvedValue({
    auc: 0.97, gini: 0.94, train_rows: 160000, test_rows: 40000, train_seconds: 12.5, features: [], algorithm: "XGBoost",
  });
  render(<SuccessCriteria />);
  expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(5);
  expect(await screen.findByText("200,000 rows trained and scored in Teradata, training took 12.5 s")).toBeInTheDocument();
});

it("still renders the criteria when the API is down", async () => {
  getModel.mockRejectedValue(new Error("down"));
  render(<SuccessCriteria />);
  expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(5);
  expect(await screen.findByText(/live proof appears when the api is connected/i)).toBeInTheDocument();
});
