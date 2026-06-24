import type { AttestedElection, OrgElectionReader } from "./types";

export class NullOrgElectionReader implements OrgElectionReader {
  read(_orgId: string): AttestedElection | null {
    return null;
  }

  isAvailable(): boolean {
    return false;
  }
}
