// @vitest-environment jsdom
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { WriteOffModal } from "./WriteOffModal";

vi.stubGlobal("fetch", vi.fn());

describe("WriteOffModal", () => {
  beforeEach(() => {
    vi.mocked(fetch).mockReset();
    vi.stubGlobal("localStorage", {
      getItem: () => "token",
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
    vi.mocked(fetch).mockImplementation((url: string | URL | Request) => {
      const u = String(url);
      if (u.includes("qbo-accounts")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ accounts: [{ id: "gl-1", name: "Bad Debt Expense" }] }),
        } as Response);
      }
      return Promise.resolve({ ok: true, json: async () => ({ result: {} }) } as Response);
    });
  });

  afterEach(() => {
    cleanup();
  });

  test("pre-fills amount with the max invoice amount", () => {
    render(
      <WriteOffModal reviewItemId="ri-1" maxAmount={42.5} onClose={vi.fn()} onResolved={vi.fn()} />,
    );
    expect(screen.getByLabelText(/amount to write off/i)).toHaveValue(42.5);
  });

  test("loads GL account options", async () => {
    render(
      <WriteOffModal reviewItemId="ri-1" maxAmount={42.5} onClose={vi.fn()} onResolved={vi.fn()} />,
    );
    await waitFor(() => expect(screen.getByText("Bad Debt Expense")).toBeInTheDocument());
  });

  test("shows an error when submitting without a GL account", async () => {
    render(
      <WriteOffModal reviewItemId="ri-1" maxAmount={42.5} onClose={vi.fn()} onResolved={vi.fn()} />,
    );
    await userEvent.click(screen.getByRole("button", { name: /confirm write-off/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/select a gl account/i);
  });

  test("submits successfully once amount and account are set", async () => {
    const onResolved = vi.fn();
    render(
      <WriteOffModal reviewItemId="ri-1" maxAmount={42.5} onClose={vi.fn()} onResolved={onResolved} />,
    );
    await waitFor(() => expect(screen.getByText("Bad Debt Expense")).toBeInTheDocument());
    await userEvent.selectOptions(screen.getByLabelText(/gl account/i), "gl-1");
    await userEvent.click(screen.getByRole("button", { name: /confirm write-off/i }));
    await waitFor(() => expect(onResolved).toHaveBeenCalled());
  });

  test("Escape key closes the dialog", () => {
    const onClose = vi.fn();
    render(
      <WriteOffModal reviewItemId="ri-1" maxAmount={42.5} onClose={onClose} onResolved={vi.fn()} />,
    );
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });
});
