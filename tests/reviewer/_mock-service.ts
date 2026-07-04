/**
 * D6.4d — Extended mock DB for reviewer API tests.
 */
import { vi } from "vitest";
import { makeMockDb, type MockDb } from "../pre-close/_mock-db";

export interface ReviewerMockDb extends MockDb {
  auth: {
    getUser: ReturnType<typeof vi.fn>;
    admin: { getUserById: ReturnType<typeof vi.fn> };
  };
  storage: {
    from: ReturnType<typeof vi.fn>;
  };
}

export function makeReviewerMockDb(): ReviewerMockDb {
  const mock = makeMockDb() as ReviewerMockDb;
  mock.__state.firm_client_users = [];
  mock.__state.engagement_review_visibility = [];
  mock.__state.je_post_attempts = [];
  mock.__state.je_posting_audit = [];
  mock.__state.je_line_evidence = [];
  mock.__state.je_line_attachments = [];
  mock.__state.je_backup_packets = [];
  mock.__state.review_item_packet_exports = [];

  mock.auth = {
    getUser: vi.fn(),
    admin: { getUserById: vi.fn().mockResolvedValue({ data: { user: { email: "r@test.com" } } }) },
  };

  const uploadMock = vi.fn().mockResolvedValue({ error: null });
  const createSignedUrlMock = vi.fn().mockResolvedValue({ data: { signedUrl: "https://signed.example/x" } });
  mock.storage = {
    from: vi.fn(() => ({
      upload: uploadMock,
      createSignedUrl: createSignedUrlMock,
    })),
  };

  const baseReset = mock.__reset.bind(mock);
  mock.__reset = () => {
    baseReset();
    mock.__state.firm_memberships = [];
    mock.__state.firm_client_users = [];
    mock.__state.engagement_review_visibility = [];
    mock.__state.je_post_attempts = [];
    mock.__state.je_posting_audit = [];
    mock.__state.je_line_evidence = [];
    mock.__state.je_line_attachments = [];
    mock.__state.je_backup_packets = [];
    mock.__state.review_item_packet_exports = [];
    mock.auth.getUser.mockReset();
    mock.auth.admin.getUserById.mockResolvedValue({ data: { user: { email: "r@test.com" } } });
  };

  return mock;
}

export function bearer(token = "tok") {
  return { headers: { authorization: `Bearer ${token}` } };
}

export function seedFirmUser(
  mock: ReviewerMockDb,
  userId: string,
  firmId: string,
  role = "firm_admin",
) {
  mock.__seed("firm_memberships", [{ firm_id: firmId, user_id: userId, role, status: "active" }]);
  mock.auth.getUser.mockResolvedValue({ data: { user: { id: userId } }, error: null });
}

export function seedEngagement(mock: ReviewerMockDb, id: string, firmId: string, name = "Eng") {
  mock.__seed("engagements", [{ id, firm_id: firmId, engagement_name: name, status: "active" }]);
}

export function seedClient(mock: ReviewerMockDb, id: string, firmId: string, name = "Client") {
  mock.__seed("firm_clients", [{ id, firm_id: firmId, name }]);
}
