import type { ReactNode } from "react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { SiteFooter } from "@/components/SiteFooter";

export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <DashboardHeader />
      {children}
      <SiteFooter />
    </>
  );
}
