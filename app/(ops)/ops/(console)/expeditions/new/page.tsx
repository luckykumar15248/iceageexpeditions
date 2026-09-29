import type { Metadata } from "next";
import Link from "next/link";
import { ExpeditionEditor } from "@/components/ops/expedition-editor";
import { OpsHeading } from "@/components/ops/ops-frame";
import { requireOpsStaff } from "@/lib/ops-auth";
import { StaffPermission, staffHasPermission } from "@/lib/staff";

export const metadata: Metadata = { title: "New expedition" };

export default async function NewExpeditionPage() {
  const staff = await requireOpsStaff();
  const canWrite = staffHasPermission(staff.role, StaffPermission.catalogWrite);
  return (
    <>
      <OpsHeading
        kicker="Route book"
        title="New expedition"
        body="Four steps: the route, the days, the dates, then search. A draft stays off the public route book. Publishing shows the route and does not open a dated departure."
      />
      <p className="mt-6">
        <Link href="/ops/expeditions" className="text-lg font-semibold text-alpine-deep underline-offset-4 hover:underline">
          Back to expeditions
        </Link>
      </p>
      {canWrite ? (
        <ExpeditionEditor expedition={null} />
      ) : (
        <p className="mt-10 text-lg text-muted">This desk role can read the route book. Creating a route needs an ops admin or expedition lead.</p>
      )}
    </>
  );
}
