import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getDocuments = vi.fn();
const uploadDocument = vi.fn();
const deleteDocument = vi.fn();
vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    errorMessage: actual.errorMessage,
    getDocuments: (...a: unknown[]) => getDocuments(...a),
    uploadDocument: (...a: unknown[]) => uploadDocument(...a),
    deleteDocument: (...a: unknown[]) => deleteDocument(...a),
  };
});
vi.mock("next/navigation", () => ({ usePathname: () => "/documents", useRouter: () => ({ push: vi.fn() }) }));

import DocumentsPage from "@/app/(app)/documents/page";

const SOP = { doc: "Fraud_Detection_SOP.pdf", kind: "pdf", pages: 131, chunks: 213, bytes: 2_621_440, uploaded_at: "2026-10-03 18:45:12" };
const OPS = { doc: "Fraud_Operations_SOP.md", kind: "md", pages: null, chunks: 7, bytes: 5120, uploaded_at: "2026-10-02 09:00:00" };

beforeEach(() => {
  getDocuments.mockReset();
  uploadDocument.mockReset();
  deleteDocument.mockReset();
});

describe("Documents page: knowledge base list", () => {
  it("explains the page and lists documents with formatted cells", async () => {
    getDocuments.mockResolvedValue([SOP, OPS]);
    render(<DocumentsPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Documents" })).toBeInTheDocument();
    expect(screen.getByText(/policies the fraud copilot searches and cites/i)).toBeInTheDocument();
    expect(screen.getByText("Computed in Teradata")).toBeInTheDocument();

    const pdfRow = (await screen.findByText("Fraud_Detection_SOP.pdf")).closest("tr") as HTMLElement;
    const pdf = within(pdfRow).getAllByRole("cell").map((c) => c.textContent);
    expect(pdf.slice(0, 5)).toEqual(["Fraud_Detection_SOP.pdf", "PDF", "131", "213", "2.5 MB"]);
    expect(pdf[5]).toContain("2026-10-03 18:45");

    const mdRow = screen.getByText("Fraud_Operations_SOP.md").closest("tr") as HTMLElement;
    expect(within(mdRow).getAllByRole("cell").slice(0, 5).map((c) => c.textContent)).toEqual([
      "Fraud_Operations_SOP.md", "MD", "-", "7", "5.0 KB",
    ]);
  });

  it("shows the empty state", async () => {
    getDocuments.mockResolvedValue([]);
    render(<DocumentsPage />);
    expect(await screen.findByText("No documents yet. Upload a policy to ground the copilot.")).toBeInTheDocument();
  });

  it("shows a loading state, then an error with Retry that refetches", async () => {
    getDocuments.mockRejectedValueOnce(new Error('500 {"detail":"Teradata is down"}')).mockResolvedValueOnce([OPS]);
    const user = userEvent.setup();
    render(<DocumentsPage />);
    expect(screen.getByRole("status", { name: /loading documents/i })).toBeInTheDocument();
    expect(await screen.findByRole("alert")).toHaveTextContent("Teradata is down");
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Fraud_Operations_SOP.md")).toBeInTheDocument();
    expect(getDocuments).toHaveBeenCalledTimes(2);
  });
});

describe("Documents page: upload", () => {
  const input = () => document.querySelector('input[type="file"]') as HTMLInputElement;
  const choose = async (user: ReturnType<typeof userEvent.setup>, file: File) => {
    // applyAccept off so the unsupported-type path is reachable like a drag and drop
    await user.upload(input(), file);
  };
  const setup = async () => {
    getDocuments.mockResolvedValue([OPS]);
    const user = userEvent.setup({ applyAccept: false });
    render(<DocumentsPage />);
    await screen.findByText("Fraud_Operations_SOP.md");
    return user;
  };

  it("offers a real file input restricted to pdf/md/txt and a Choose file button", async () => {
    await setup();
    expect(input()).toHaveAttribute("accept", ".pdf,.md,.txt");
    expect(screen.getByRole("button", { name: "Choose file" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upload" })).toBeDisabled();
  });

  it("rejects an unsupported file type without calling the API", async () => {
    const user = await setup();
    await choose(user, new File(["x"], "notes.docx"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Unsupported file type");
    expect(screen.getByRole("button", { name: "Upload" })).toBeDisabled();
    expect(uploadDocument).not.toHaveBeenCalled();
  });

  it("rejects a file larger than 25 MB without calling the API", async () => {
    const user = await setup();
    const big = new File(["x"], "big.pdf");
    Object.defineProperty(big, "size", { value: 26 * 1024 * 1024 });
    await choose(user, big);
    expect(await screen.findByRole("alert")).toHaveTextContent(/larger than 25 MB/);
    expect(uploadDocument).not.toHaveBeenCalled();
  });

  it("shows the selected file name and size, uploads it, reports the result and refetches", async () => {
    const user = await setup();
    let resolve!: (d: unknown) => void;
    uploadDocument.mockReturnValue(new Promise((r) => (resolve = r)));
    getDocuments.mockResolvedValue([SOP, OPS]);
    const file = new File([new Uint8Array(2048)], "Fraud_Detection_SOP.pdf", { type: "application/pdf" });
    await choose(user, file);
    expect(screen.getByText("Fraud_Detection_SOP.pdf")).toBeInTheDocument();
    expect(screen.getByText("2.0 KB")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Upload" }));
    expect(uploadDocument).toHaveBeenCalledWith(file);
    expect(screen.getByRole("button", { name: /uploading/i })).toBeDisabled();
    expect(screen.getByText(/Uploading and indexing\.\.\. large PDFs can take up to a minute/)).toBeInTheDocument();

    resolve(SOP);
    expect(await screen.findByText("Indexed 213 chunks from 131 pages")).toBeInTheDocument();
    expect(getDocuments).toHaveBeenCalledTimes(2);
    expect(await screen.findByText("213")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upload" })).toBeDisabled();
  });

  it("reports chunks only for documents without pages", async () => {
    const user = await setup();
    uploadDocument.mockResolvedValue(OPS);
    await choose(user, new File(["# hi"], "Fraud_Operations_SOP.md"));
    await user.click(screen.getByRole("button", { name: "Upload" }));
    expect(await screen.findByText("Indexed 7 chunks")).toBeInTheDocument();
  });

  it("shows the backend's detail when the upload fails", async () => {
    const user = await setup();
    uploadDocument.mockRejectedValue(new Error('413 {"detail":"File is larger than 25 MB"}'));
    await choose(user, new File(["x"], "a.pdf"));
    await user.click(screen.getByRole("button", { name: "Upload" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("File is larger than 25 MB");
    expect(screen.getByRole("button", { name: "Upload" })).toBeEnabled();
  });

  it("accepts a dropped file", async () => {
    await setup();
    const { fireEvent } = await import("@testing-library/react");
    const file = new File(["x"], "dropped.txt");
    fireEvent.drop(screen.getByTestId("dropzone"), { dataTransfer: { files: [file] } });
    expect(screen.getByText("dropped.txt")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upload" })).toBeEnabled();
  });
});

describe("Documents page: delete", () => {
  const open = async () => {
    getDocuments.mockResolvedValue([SOP, OPS]);
    const user = userEvent.setup();
    render(<DocumentsPage />);
    await screen.findByText("Fraud_Operations_SOP.md");
    await user.click(screen.getByRole("button", { name: "Delete Fraud_Operations_SOP.md" }));
    return user;
  };

  it("asks for confirmation, and Cancel does nothing", async () => {
    const user = await open();
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("Delete Fraud_Operations_SOP.md? The copilot will stop citing it.");
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(deleteDocument).not.toHaveBeenCalled();
    expect(getDocuments).toHaveBeenCalledTimes(1);
  });

  it("confirming deletes by name and refetches", async () => {
    const user = await open();
    deleteDocument.mockResolvedValue({ deleted: "Fraud_Operations_SOP.md", chunks: 7 });
    getDocuments.mockResolvedValue([SOP]);
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Delete" }));
    expect(deleteDocument).toHaveBeenCalledWith("Fraud_Operations_SOP.md");
    expect(await screen.findByText("Fraud_Detection_SOP.pdf")).toBeInTheDocument();
    expect(screen.queryByText("Fraud_Operations_SOP.md")).not.toBeInTheDocument();
    expect(getDocuments).toHaveBeenCalledTimes(2);
  });

  it("shows the backend's detail inside the dialog when delete fails", async () => {
    const user = await open();
    deleteDocument.mockRejectedValue(new Error('404 {"detail":"Unknown document"}'));
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Delete" }));
    expect(await screen.findByText("Unknown document")).toBeInTheDocument();
  });
});

describe("Documents page: view the original", () => {
  it("opens a PDF in the viewer when its name is clicked, and closes it again", async () => {
    getDocuments.mockResolvedValue([SOP, OPS]);
    const user = userEvent.setup();
    render(<DocumentsPage />);
    await user.click(await screen.findByRole("button", { name: "View Fraud_Detection_SOP.pdf" }));
    const viewer = await screen.findByRole("region", { name: "Viewing Fraud_Detection_SOP.pdf" });
    expect(within(viewer).getByTitle("Fraud_Detection_SOP.pdf")).toHaveAttribute("src", "/api/documents/Fraud_Detection_SOP.pdf/file");
    await user.click(screen.getByRole("button", { name: "Close viewer" }));
    expect(screen.queryByRole("region", { name: /Viewing/ })).not.toBeInTheDocument();
  });

  it("every uploaded document can be opened, and a text document shows its content", async () => {
    getDocuments.mockResolvedValue([SOP, OPS]);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, text: async () => "Priority 1 alerts within 15 minutes." }));
    const user = userEvent.setup();
    render(<DocumentsPage />);
    await user.click(await screen.findByRole("button", { name: "View Fraud_Operations_SOP.md" }));
    const viewer = await screen.findByRole("region", { name: "Viewing Fraud_Operations_SOP.md" });
    expect(await within(viewer).findByText("Priority 1 alerts within 15 minutes.")).toBeInTheDocument();
    vi.unstubAllGlobals();
  });
});
