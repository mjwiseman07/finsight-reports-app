// @vitest-environment jsdom
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AccountSupportModal } from "../../components/AccountSupportModal";

vi.mock("../../lib/supabase", () => ({
  supabase: { auth: { signOut: vi.fn().mockResolvedValue({}) } },
}));

const mockTickets = [
  {
    id: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
    ticket_number: 42,
    subject: "Cannot post journal entry",
    status: "Open",
    correlation_id: "abc12345-def0-4000-8000-000000000000",
    created_at: "2026-07-18T00:00:00Z",
  },
];

const mockPrefill = { signals: [{ kind: "qbo_connection_expired", severity: "high" }] };

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) => {
      if (url.startsWith("/api/support/tickets")) {
        return Promise.resolve({ json: () => Promise.resolve({ tickets: mockTickets }) });
      }
      if (url.startsWith("/api/support/prefill")) {
        return Promise.resolve({ json: () => Promise.resolve(mockPrefill) });
      }
      return Promise.resolve({ json: () => Promise.resolve({}) });
    }),
  );
});

describe("AccountSupportModal", () => {
  it("returns null when closed", () => {
    const { container } = render(
      <AccountSupportModal open={false} onClose={() => {}} userEmail="user@example.com" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders user email and sections when open", async () => {
    render(<AccountSupportModal open={true} onClose={() => {}} userEmail="user@example.com" />);
    expect(await screen.findByText("user@example.com")).toBeInTheDocument();
    expect(screen.getByText(/Account & Support/)).toBeInTheDocument();
    expect(screen.getByText(/Connection health/)).toBeInTheDocument();
    expect(screen.getByText(/Recent tickets/)).toBeInTheDocument();
  });

  it("shows human-language signal from prefill", async () => {
    render(<AccountSupportModal open={true} onClose={() => {}} userEmail="user@example.com" />);
    await waitFor(() =>
      expect(screen.getByText(/Your QuickBooks connection needs a refresh/)).toBeInTheDocument(),
    );
  });

  it("shows recent ticket with correlation prefix", async () => {
    render(<AccountSupportModal open={true} onClose={() => {}} userEmail="user@example.com" />);
    await waitFor(() => expect(screen.getByText(/Cannot post journal entry/)).toBeInTheDocument());
    expect(screen.getByText(/abc12345/)).toBeInTheDocument();
  });

  it("correlation lookup finds matching ticket by prefix", async () => {
    render(<AccountSupportModal open={true} onClose={() => {}} userEmail="user@example.com" />);
    await waitFor(() => expect(screen.getByText(/Cannot post journal entry/)).toBeInTheDocument());
    const input = screen.getByPlaceholderText(/Paste correlation ID/);
    fireEvent.change(input, { target: { value: "abc12345" } });
    fireEvent.click(screen.getByText("Look up"));
    expect(await screen.findByText(/Found: #42 — Cannot post journal entry/)).toBeInTheDocument();
  });

  it("correlation lookup shows miss state for unknown ID", async () => {
    render(<AccountSupportModal open={true} onClose={() => {}} userEmail="user@example.com" />);
    await waitFor(() => expect(screen.getByText(/Cannot post journal entry/)).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText(/Paste correlation ID/), {
      target: { value: "zzz99999" },
    });
    fireEvent.click(screen.getByText("Look up"));
    expect(await screen.findByText(/No match in your recent tickets/)).toBeInTheDocument();
  });

  it("Escape key triggers onClose", () => {
    const onClose = vi.fn();
    render(<AccountSupportModal open={true} onClose={onClose} userEmail="user@example.com" />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });
});
