import {
  buildWebhookSubscription,
  type BuildWebhookSubscriptionInput,
  type SyntheticWebhookSubscription,
} from "./buildWebhookSubscription";

export interface BuildWebhookSubscriptionsInput {
  webhookSubscriptions: BuildWebhookSubscriptionInput[];
}

export interface BuildWebhookSubscriptionsResult {
  webhookSubscriptions: SyntheticWebhookSubscription[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildWebhookSubscriptions(input: BuildWebhookSubscriptionsInput): BuildWebhookSubscriptionsResult {
  const webhookSubscriptions: SyntheticWebhookSubscription[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.webhookSubscriptions.forEach((subscriptionInput, index) => {
    const result = buildWebhookSubscription({
      ...subscriptionInput,
      skippedIndexes: [...(subscriptionInput.skippedIndexes ?? []), index],
    });

    if (result.webhookSubscription) {
      webhookSubscriptions.push(result.webhookSubscription);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `webhookSubscription[${index}]: ${warning}`));
  });

  return {
    webhookSubscriptions,
    skippedIndexes,
    warnings,
  };
}
