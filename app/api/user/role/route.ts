import { NextResponse } from "next/server";
import { getUserFromRequest, userHasActiveFirmAdminRole } from "@/lib/mfa/server";

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ role: null }, { status: 200 });
  const isFirmAdmin = await userHasActiveFirmAdminRole(user.id);
  return NextResponse.json({ role: isFirmAdmin ? "firm_admin" : "member" });
}
