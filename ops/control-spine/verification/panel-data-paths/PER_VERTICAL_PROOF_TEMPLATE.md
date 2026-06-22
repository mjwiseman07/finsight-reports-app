# Per-Vertical Panel Data Path Proof Template

## Vertical name + overlay namespace

- **Vertical:** _(e.g. Manufacturing, Healthcare, Retail)_
- **Overlay namespace:** _(e.g. `ops/compliance/overlays/hipaa/` or none for non-regulated verticals)_

## Panel inventory

List command-center panels in scope for this vertical:

| Panel ID | Description | Regulated data path |
|----------|-------------|---------------------|
| | | |

## Per-panel proof matrix

For each panel document:

- **Expected tenants:** which tenant IDs may render this panel
- **Expected personas:** firm-staff, firm-admin, client-side
- **Expected taxonomy tags:** spine panel field taxonomy tags present in rendered output
- **Expected DENY conditions:** PHI outside overlay, cross-tenant leak, persona-scope violation

## Proof artifacts

1. Harness run output (`proveRenderedPanelBoundary` JSON) checked in under `ops/control-spine/verification/panel-data-paths/`
2. Screenshot of rendered panel under each persona (stored outside repo or in trust evidence pack)

## Re-run obligation

When overlay attachment, panel inventory, or spine isolation rules change, regenerate proof artifacts and re-run:

- `node scripts/d0-evidence-panel-data-paths.js`
- `node scripts/verify-ops-control-spine.js`
- `node scripts/probe-ops-control-spine.js`
