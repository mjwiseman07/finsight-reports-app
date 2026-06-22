/** Synthetic PHI-tagged fixtures for 42.5O probe — tag-shaped only, no real PHI values. executable: false */

function dimension(tenantScopeKey, referenceSuffix) {
  return {
    isolationDimensionReferenceId: `dim-ref:${referenceSuffix}`,
    tenantScopeKey,
    boundaryReferenceIds: [`boundary:${referenceSuffix}`],
  };
}

function buildIsolationScope(input) {
  return {
    customerTenantId: input.customerTenantId,
    firmTenantId: input.firmTenantId,
    clientTenantId: input.clientTenantId,
    isolationScopeReferenceId: input.isolationScopeReferenceId,
    customerIsolation: dimension(input.customerTenantId, `customer:${input.isolationScopeReferenceId}`),
    firmIsolation: dimension(input.firmTenantId, `firm:${input.isolationScopeReferenceId}`),
    clientIsolation: dimension(input.clientTenantId, `client:${input.isolationScopeReferenceId}`),
  };
}

function buildActivationScope(input) {
  return {
    customerTenantId: input.customerTenantId,
    firmTenantId: input.firmTenantId,
    clientTenantId: input.clientTenantId,
    activationScopeReferenceId: input.activationScopeReferenceId,
    customerIsolation: dimension(input.customerTenantId, `customer:${input.activationScopeReferenceId}`),
    firmIsolation: dimension(input.firmTenantId, `firm:${input.activationScopeReferenceId}`),
    clientIsolation: dimension(input.clientTenantId, `client:${input.activationScopeReferenceId}`),
  };
}

const SYNTHETIC_PHI_TAG = {
  phi: true,
  taxonomy: "patient-identifier",
  value: "SYNTHETIC-001",
  phiDataClassKey: "electronic_phi",
  phiDataClassReferenceId: "marker-ref:synthetic:electronic-phi-001",
};

const TENANT_A = {
  customerTenantId: "tenant-a-probe",
  firmTenantId: "firm-a-probe",
  clientTenantId: "client-a-probe",
  isolationScopeReferenceId: "scope:probe-tenant-a",
  activationScopeReferenceId: "scope:activation:probe-tenant-a",
};

const TENANT_B = {
  customerTenantId: "tenant-b-probe",
  firmTenantId: "firm-b-probe",
  clientTenantId: "client-b-probe",
  isolationScopeReferenceId: "scope:probe-tenant-b",
  activationScopeReferenceId: "scope:activation:probe-tenant-b",
};

const NON_OVERLAY_TENANT = {
  customerTenantId: "tenant-non-overlay-probe",
  firmTenantId: "firm-non-overlay-probe",
  clientTenantId: "client-non-overlay-probe",
  isolationScopeReferenceId: "scope:probe-non-overlay",
  activationScopeReferenceId: "scope:activation:probe-non-overlay",
};

module.exports = {
  SYNTHETIC_PHI_TAG,
  TENANT_A,
  TENANT_B,
  NON_OVERLAY_TENANT,
  buildIsolationScope,
  buildActivationScope,
  buildPhiMarkerDescriptor() {
    return {
      phiDataClassReferenceId: SYNTHETIC_PHI_TAG.phiDataClassReferenceId,
      phiDataClassKey: SYNTHETIC_PHI_TAG.phiDataClassKey,
      markerParseable: true,
    };
  },
};
