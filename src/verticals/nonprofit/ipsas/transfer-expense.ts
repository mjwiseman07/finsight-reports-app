export function evaluateTransferExpense(input: {
  stipulationMet: boolean;
  returnObligation: boolean;
}): { expenseRecognized: boolean; reason: string } {
  if (input.returnObligation) {
    return { expenseRecognized: false, reason: "transfer-expense-return-obligation" };
  }
  if (!input.stipulationMet) {
    return { expenseRecognized: false, reason: "transfer-expense-stipulation-unmet" };
  }
  return { expenseRecognized: true, reason: "transfer-expense-recognized" };
}
