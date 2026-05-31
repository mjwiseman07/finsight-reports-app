const tierRank = {
  pulse_starter: 1,
  essential: 1,
  pulse_pro: 2,
  professional: 3,
  advisacor_professional: 3,
  virtual_cfo: 4,
  virtualCfo: 4,
  advisacor_cfo: 4,
};

const tierLabels = {
  pulse_starter: "Pulse Starter",
  essential: "Pulse Starter",
  pulse_pro: "Pulse Pro",
  professional: "Advisacor Professional",
  advisacor_professional: "Advisacor Professional",
  virtual_cfo: "Advisacor CFO",
  virtualCfo: "Advisacor CFO",
  advisacor_cfo: "Advisacor CFO",
};

export function recommendPackage(capabilities, currentSubscription = null) {
  const hasPayroll = Boolean(capabilities?.has_payroll);
  const hasInventory = Boolean(capabilities?.has_inventory);
  const hasClasses = Boolean(capabilities?.has_classes);
  const hasBudgets = Boolean(capabilities?.has_budgets);

  let recommended_package = "pulse_starter";
  if (hasPayroll && hasInventory && hasClasses && hasBudgets) {
    recommended_package = "advisacor_cfo";
  } else if (hasPayroll || hasInventory || hasClasses) {
    recommended_package = "advisacor_professional";
  } else if (hasBudgets) {
    recommended_package = "pulse_pro";
  }

  const missingVirtualCfoFeatures = [
    !hasPayroll ? "payroll" : null,
    !hasInventory ? "inventory" : null,
    !hasClasses ? "class tracking" : null,
    !hasBudgets ? "budgets" : null,
  ].filter(Boolean);

  const normalizedCurrentSubscription = currentSubscription === "virtualCfo" ? "virtual_cfo" : currentSubscription;
  const mismatch_warning =
    normalizedCurrentSubscription &&
    tierRank[normalizedCurrentSubscription] > tierRank[recommended_package]
      ? `Your current ${tierLabels[normalizedCurrentSubscription]} subscription is higher than what this QuickBooks connection appears to support. Missing features: ${missingVirtualCfoFeatures.join(", ") || "advanced QuickBooks data"}.`
      : "";

  return {
    recommended_package,
    mismatch_warning,
    missing_virtual_cfo_features: missingVirtualCfoFeatures,
  };
}
