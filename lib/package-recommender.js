const tierRank = {
  essential: 1,
  professional: 2,
  virtual_cfo: 3,
  virtualCfo: 3,
};

const tierLabels = {
  essential: "Essential",
  professional: "Professional",
  virtual_cfo: "Virtual CFO",
  virtualCfo: "Virtual CFO",
};

export function recommendPackage(capabilities, currentSubscription = null) {
  const hasPayroll = Boolean(capabilities?.has_payroll);
  const hasInventory = Boolean(capabilities?.has_inventory);
  const hasClasses = Boolean(capabilities?.has_classes);
  const hasBudgets = Boolean(capabilities?.has_budgets);

  let recommended_package = "essential";
  if (hasPayroll && hasInventory && hasClasses && hasBudgets) {
    recommended_package = "virtual_cfo";
  } else if (hasPayroll || hasInventory || hasClasses) {
    recommended_package = "professional";
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
