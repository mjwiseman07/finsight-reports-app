import type { AttestedElection } from "./types";

export interface OrgElectionReader {
  read(orgId: string): AttestedElection | null;
  isAvailable(): boolean;
}
