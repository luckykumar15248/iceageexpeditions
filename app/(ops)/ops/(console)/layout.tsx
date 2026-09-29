import { OpsFrame } from "@/components/ops/ops-frame";
import { requireOpsStaff } from "@/lib/ops-auth";

export const dynamic = "force-dynamic";

export default async function OpsConsoleLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireOpsStaff();
  return <OpsFrame staff={staff}>{children}</OpsFrame>;
}
