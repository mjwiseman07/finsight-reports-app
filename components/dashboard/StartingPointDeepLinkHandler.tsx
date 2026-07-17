"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Props = {
  onExecutivePackage: () => void;
  onFinancialHealthScore: () => void;
  onAskPulse: () => void;
};

export default function StartingPointDeepLinkHandler({
  onExecutivePackage,
  onFinancialHealthScore,
  onAskPulse,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const startingPoint = searchParams?.get("startingPoint");
    if (!startingPoint) return;
    if (startingPoint === "executive-package") {
      onExecutivePackage();
    } else if (startingPoint === "financial-health-score") {
      onFinancialHealthScore();
    } else if (startingPoint === "ask-pulse") {
      onAskPulse();
    }
    router.replace("/dashboard", { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return null;
}
