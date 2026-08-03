import { describe, it, expect, vi } from "vitest";
import { bootstrapCompanyForUser } from "@/lib/tcp1/create-session-company";

type QueryResult = { data: unknown; error: unknown };

function makeChain(result: QueryResult) {
  const chain: Record<string, unknown> = {};
  const self = new Proxy(chain, {
    get(_target, prop: string) {
      if (prop === "then") {
        // Not a thenable — awaited methods return promises below.
        return undefined;
      }
      if (prop === "maybeSingle" || prop === "single") {
        return () => Promise.resolve(result);
      }
      return () => self;
    },
  });
  return self;
}

function makeAdmin(handlers: {
  companyUsersLookup?: QueryResult;
  companiesInsert?: QueryResult;
  companyUsersInsert?: QueryResult;
  companiesDelete?: QueryResult;
}) {
  return {
    from(table: string) {
      if (table === "company_users") {
        // First call: select lookup; later: insert.
        const callCount = { n: 0 };
        return {
          select: () => {
            callCount.n += 1;
            return makeChain(
              handlers.companyUsersLookup ?? { data: null, error: null },
            );
          },
          insert: () =>
            Promise.resolve(
              handlers.companyUsersInsert ?? { data: null, error: null },
            ),
          eq: () => makeChain(handlers.companyUsersLookup ?? { data: null, error: null }),
          limit: () => makeChain(handlers.companyUsersLookup ?? { data: null, error: null }),
          maybeSingle: () =>
            Promise.resolve(handlers.companyUsersLookup ?? { data: null, error: null }),
        };
      }
      if (table === "companies") {
        return {
          insert: () => ({
            select: () => ({
              single: () =>
                Promise.resolve(
                  handlers.companiesInsert ?? {
                    data: { id: "company-new" },
                    error: null,
                  },
                ),
            }),
          }),
          delete: () => ({
            eq: () =>
              Promise.resolve(handlers.companiesDelete ?? { data: null, error: null }),
          }),
        };
      }
      throw new Error(`Unexpected table ${table}`);
    },
  };
}

describe("bootstrapCompanyForUser", () => {
  it("returns existing company_id when owner_executive membership exists", async () => {
    const admin = makeAdmin({
      companyUsersLookup: {
        data: { company_id: "company-existing" },
        error: null,
      },
    });

    const result = await bootstrapCompanyForUser({
      // @ts-expect-error — minimal mock
      admin,
      userId: "user-1",
      businessName: "Acme Books",
    });

    expect(result).toEqual({ companyId: "company-existing", created: false });
  });

  it("creates company + owner_executive membership when none exists", async () => {
    let insertPayload: Record<string, unknown> | null = null;
    const admin = {
      from(table: string) {
        if (table === "company_users") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  eq: () => ({
                    limit: () => ({
                      maybeSingle: () => Promise.resolve({ data: null, error: null }),
                    }),
                  }),
                }),
              }),
            }),
            insert: (payload: Record<string, unknown>) => {
              insertPayload = payload;
              return Promise.resolve({ data: null, error: null });
            },
          };
        }
        if (table === "companies") {
          return {
            insert: () => ({
              select: () => ({
                single: () =>
                  Promise.resolve({ data: { id: "company-new" }, error: null }),
              }),
            }),
            delete: () => ({
              eq: () => Promise.resolve({ data: null, error: null }),
            }),
          };
        }
        throw new Error(`Unexpected table ${table}`);
      },
    };

    const result = await bootstrapCompanyForUser({
      // @ts-expect-error — minimal mock
      admin,
      userId: "user-1",
      businessName: "Acme Books",
    });

    expect(result).toEqual({ companyId: "company-new", created: true });
    expect(insertPayload).toEqual({
      company_id: "company-new",
      user_id: "user-1",
      role: "owner_executive",
      status: "active",
    });
  });

  it("rolls back company and throws when membership insert fails", async () => {
    const deleteEq = vi.fn(() => Promise.resolve({ data: null, error: null }));
    const admin = {
      from(table: string) {
        if (table === "company_users") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  eq: () => ({
                    limit: () => ({
                      maybeSingle: () => Promise.resolve({ data: null, error: null }),
                    }),
                  }),
                }),
              }),
            }),
            insert: () =>
              Promise.resolve({ data: null, error: { message: "fk fail" } }),
          };
        }
        if (table === "companies") {
          return {
            insert: () => ({
              select: () => ({
                single: () =>
                  Promise.resolve({ data: { id: "company-orphan" }, error: null }),
              }),
            }),
            delete: () => ({ eq: deleteEq }),
          };
        }
        throw new Error(`Unexpected table ${table}`);
      },
    };

    await expect(
      bootstrapCompanyForUser({
        // @ts-expect-error — minimal mock
        admin,
        userId: "user-1",
        businessName: "Acme Books",
      }),
    ).rejects.toThrow("company_membership_create_failed");
    expect(deleteEq).toHaveBeenCalledWith("id", "company-orphan");
  });
});
