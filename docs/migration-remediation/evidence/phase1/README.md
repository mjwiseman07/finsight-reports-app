# Phase1 fetched migration evidence

**Status:** Empty — CLI authentication unavailable during review gate.

After `npx supabase login`, run isolated `supabase migration fetch` and place files here with provenance header:

```
PROVENANCE=FETCHED_PRODUCTION
RECOVERED_AT=<ISO8601>
SOURCE=supabase migration fetch --linked
PROJECT_REF=jzmdgwwiestcmmeuhhkr
```

Do not commit credentials or connection strings.
