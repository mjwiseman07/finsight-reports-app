import {
  buildControllerNotification,
  type BuildControllerNotificationInput,
  type SyntheticControllerNotification,
} from "./buildControllerNotification";

export interface BuildControllerNotificationsInput {
  notifications: BuildControllerNotificationInput[];
}

export interface BuildControllerNotificationsResult {
  controllerNotifications: SyntheticControllerNotification[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildControllerNotifications(
  input: BuildControllerNotificationsInput,
): BuildControllerNotificationsResult {
  const controllerNotifications: SyntheticControllerNotification[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.notifications.forEach((notificationInput, index) => {
    const result = buildControllerNotification({
      ...notificationInput,
      skippedIndexes: [...(notificationInput.skippedIndexes ?? []), index],
    });

    if (result.controllerNotification) {
      controllerNotifications.push(result.controllerNotification);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `notification[${index}]: ${warning}`));
  });

  return {
    controllerNotifications,
    skippedIndexes,
    warnings,
  };
}
