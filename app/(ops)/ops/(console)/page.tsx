import Link from "next/link";
import { OpsHeading, OpsOffline } from "@/components/ops/ops-frame";
import { loadOpsOverview } from "@/lib/ops-dashboard";

function when(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export default async function OpsHomePage() {
  const snapshot = await loadOpsOverview();
  return (
    <>
      <OpsHeading
        kicker="Ops desk"
        title="Overview"
        body="Published expeditions, open departures, and booking requests waiting on the desk. These figures come from the route book."
      />
      {snapshot.data === "offline" ? (
        <OpsOffline />
      ) : (
        <>
          <dl className="mt-10 grid gap-4 sm:grid-cols-3">
            <Stat label="Published expeditions" value={snapshot.data.publishedExpeditions} href="/ops/expeditions" />
            <Stat label="Pending booking requests" value={snapshot.data.pendingRequests} href="/ops/departures" />
            <Stat label="Open departures" value={snapshot.data.openDepartures} href="/ops/departures" />
          </dl>
          <section className="mt-10 rounded-3xl border border-line bg-paper p-6 shadow-[0_12px_32px_rgba(26,29,27,0.07)] sm:p-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 className="font-display text-xl font-bold tracking-tight text-ink sm:text-2xl">Recent leads</h2>
              <Link href="/ops/enquiries" className="text-base font-medium text-alpine-deep hover:underline">
                All enquiries
              </Link>
            </div>
            {snapshot.data.leads.length === 0 ? (
              <p className="mt-4 text-base leading-relaxed text-muted">No open enquiries are on file.</p>
            ) : (
              <div className="mt-6 overflow-x-auto">
                <table className="w-full min-w-[36rem] text-left text-base">
                  <thead>
                    <tr className="border-b border-line text-xs font-medium uppercase tracking-wide text-muted">
                      <th className="py-3 pr-4 font-semibold">Name</th>
                      <th className="py-3 pr-4 font-semibold">Kind</th>
                      <th className="py-3 font-semibold">Received</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshot.data.leads.map((lead) => (
                      <tr key={lead.id} className="border-b border-line last:border-0">
                        <td className="py-4 pr-4 font-semibold text-ink">{lead.name}</td>
                        <td className="py-4 pr-4 text-ink">{lead.kind.replaceAll("_", " ")}</td>
                        <td className="py-4 text-muted">{when(lead.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}

function Stat({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <div className="rounded-3xl border border-line bg-paper p-6 shadow-[0_12px_32px_rgba(26,29,27,0.07)]">
      <dt className="text-base font-semibold tracking-[0.12em] text-alpine uppercase">{label}</dt>
      <dd className="mt-3 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">{value}</dd>
      <Link href={href} className="mt-3 inline-flex text-base font-medium text-alpine-deep hover:underline">
        Open
      </Link>
    </div>
  );
}
