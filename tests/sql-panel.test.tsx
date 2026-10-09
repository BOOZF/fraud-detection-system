import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SqlPanel } from "@/components/SqlPanel";

it("opens and closes the drawer showing the SQL", async () => {
  const user = userEvent.setup();
  render(<SqlPanel sql={["SELECT * FROM fraud_scores", "SELECT 2"]} />);
  expect(screen.queryByText("SELECT * FROM fraud_scores")).not.toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: /show sql/i }));
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  expect(screen.getByText("SELECT * FROM fraud_scores")).toBeInTheDocument();
  expect(screen.getByText("SELECT 2")).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: /close/i }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
