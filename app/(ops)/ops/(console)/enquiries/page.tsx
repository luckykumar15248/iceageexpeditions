import type { Metadata } from "next";
import { EnquiriesBoard } from "@/components/ops/enquiries-board";
import { OpsHeading, OpsOffline } from "@/components/ops/ops-frame";
import { loadEnquiryDesk, parseEnquiryFilters } from "@/lib/enquiry-desk";

export const metadata: Metadata = { title: "Enquiries" };

export default async function OpsEnquiriesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseEnquiryFilters(await searchParams);
  const snapshot = await loadEnquiryDesk(filters);
  return (
    <>
      <OpsHeading
        kicker="Desk"
        title="Enquiries"
        body="Booking requests, waitlists, and custom group leads. Phone numbers on this desk are the numbers travelers submitted. Fitness self-declarations stay off the list unless your role can read them."
      />
      {"offline" in snapshot ? (
        <OpsOffline />
      ) : (
        <EnquiriesBoard
          filters={filters}
          rows={snapshot.rows}
          total={snapshot.total}
          page={snapshot.page}
          pageSize={snapshot.pageSize}
          openLead={snapshot.openLead}
          expeditions={snapshot.expeditions}
          canUpdate={snapshot.canUpdate}
        />
      )}
    </>
  );
}
