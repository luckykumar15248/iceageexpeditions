"use client"

import { useEffect, useEffectEvent, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { updateEnquiryAction } from "@/app/(ops)/ops/cms-actions"
import { ENQUIRY_STATUSES, STATUS_LABEL, statusBadgeClass } from "@/lib/enquiry-labels"
import { enquiryQuery, type DeskLead, type EnquiryFilters } from "@/lib/enquiry-filters"

const field = "min-h-11 w-full rounded-md border border-line bg-paper px-4 text-base text-ink"

export function EnquiriesBoard({
  filters,
  rows,
  total,
  page,
  pageSize,
  openLead,
  expeditions,
  canUpdate,
}: {
  filters: EnquiryFilters
  rows: DeskLead[]
  total: number
  page: number
  pageSize: number
  openLead: DeskLead | null
  expeditions: { id: string; title: string }[]
  canUpdate: boolean
}) {
  const router = useRouter()
  const [q, setQ] = useState(filters.q)
  const [syncedQ, setSyncedQ] = useState(filters.q)
  if (syncedQ !== filters.q) {
    setSyncedQ(filters.q)
    setQ(filters.q)
  }
  const exportQuery = enquiryQuery({ ...filters, page: 1, lead: undefined }).replace(/^\?/, "")
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(total, page * pageSize)
  const pages = Math.max(1, Math.ceil(total / pageSize))

  const pushSearch = useEffectEvent((term: string) => {
    if (term === filters.q) return
    router.push(`/ops/enquiries${enquiryQuery({ ...filters, q: term, page: 1, lead: undefined })}`)
  })

  useEffect(() => {
    const handle = window.setTimeout(() => pushSearch(q.trim()), 300)
    return () => window.clearTimeout(handle)
  }, [q])

  function go(next: EnquiryFilters) {
    router.push(`/ops/enquiries${enquiryQuery(next)}`)
  }

  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-base leading-relaxed text-muted">
          {total === 0 ? "No leads match these filters." : `Showing ${from}–${to} of ${total}`}
        </p>
        <a
          href={exportQuery ? `/ops/enquiries/export?${exportQuery}` : "/ops/enquiries/export"}
          className="inline-flex min-h-11 items-center rounded-md bg-alpine px-6 text-base font-medium text-white hover:bg-alpine-deep"
        >
          Export to Excel / CSV
        </a>
      </div>

      <form action="/ops/enquiries" className="mt-5 grid gap-4 rounded-3xl border border-line bg-paper p-6 shadow-[0_12px_32px_rgba(26,29,27,0.07)]">
        <label className="flex flex-col gap-2 text-base font-semibold text-ink">
          Search name, email, or phone
          <input
            name="q"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            className={field}
            autoComplete="off"
          />
        </label>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="flex flex-col gap-2 text-base font-semibold text-ink">
            Status
            <select
              name="status"
              value={filters.status ?? ""}
              className={field}
              onChange={(event) => go({ ...filters, q: q.trim(), status: event.target.value ? (event.target.value as EnquiryFilters["status"]) : undefined, page: 1, lead: undefined })}
            >
              <option value="">All statuses</option>
              {ENQUIRY_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABEL[status]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-base font-semibold text-ink">
            Route
            <select
              name="expedition"
              value={filters.expeditionId ?? ""}
              className={field}
              onChange={(event) => go({ ...filters, q: q.trim(), expeditionId: event.target.value || undefined, page: 1, lead: undefined })}
            >
              <option value="">All routes</option>
              {expeditions.map((expedition) => (
                <option key={expedition.id} value={expedition.id}>
                  {expedition.title}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-base font-semibold text-ink">
            Vehicle
            <select
              name="vehicle"
              value={filters.vehicle ?? ""}
              className={field}
              onChange={(event) =>
                go({
                  ...filters,
                  q: q.trim(),
                  vehicle: event.target.value === "SUV_4X4" || event.target.value === "MOTORBIKE" ? event.target.value : undefined,
                  page: 1,
                  lead: undefined,
                })
              }
            >
              <option value="">SUV and motorbike</option>
              <option value="SUV_4X4">4x4 SUV</option>
              <option value="MOTORBIKE">Motorbike</option>
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-2 text-base font-semibold text-ink">
              Submitted from
              <input
                type="date"
                name="from"
                value={filters.from ?? ""}
                className={field}
                onChange={(event) => go({ ...filters, q: q.trim(), from: event.target.value || undefined, page: 1, lead: undefined })}
              />
            </label>
            <label className="flex flex-col gap-2 text-base font-semibold text-ink">
              Submitted to
              <input
                type="date"
                name="to"
                value={filters.to ?? ""}
                className={field}
                onChange={(event) => go({ ...filters, q: q.trim(), to: event.target.value || undefined, page: 1, lead: undefined })}
              />
            </label>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="submit" className="min-h-11 rounded-md border border-line px-6 text-base font-medium text-ink">
            Apply filters
          </button>
          <button
            type="button"
            className="min-h-11 text-base font-medium text-alpine-deep"
            onClick={() => {
              setQ("")
              go({ q: "", page: 1 })
            }}
          >
            Clear
          </button>
        </div>
      </form>

      {rows.length === 0 ? null : (
        <>
          <div className="mt-6 hidden overflow-x-auto rounded-3xl border border-line bg-paper shadow-[0_12px_32px_rgba(26,29,27,0.07)] lg:block">
            <table className="w-full min-w-[72rem] text-left text-base">
              <thead>
                <tr className="border-b border-line text-xs font-medium uppercase tracking-wide text-muted">
                  <th className="px-5 py-4 font-semibold">Traveler</th>
                  <th className="px-5 py-4 font-semibold">Phone / WhatsApp</th>
                  <th className="px-5 py-4 font-semibold">Route</th>
                  <th className="px-5 py-4 font-semibold">Vehicle</th>
                  <th className="px-5 py-4 font-semibold">Group</th>
                  <th className="px-5 py-4 font-semibold">Travel</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 font-semibold">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-line last:border-0">
                    <td className="px-5 py-4">
                      <button type="button" className="font-semibold text-ink underline-offset-4 hover:underline" onClick={() => go({ ...filters, lead: row.id })}>
                        {row.name}
                      </button>
                      <p className="text-muted">{row.email}</p>
                    </td>
                    <td className="px-5 py-4 text-ink">{row.phone}</td>
                    <td className="px-5 py-4 text-ink">{row.routeTitle}</td>
                    <td className="px-5 py-4 text-ink">{row.vehicleLabel}</td>
                    <td className="px-5 py-4 text-ink">{row.partyLabel}</td>
                    <td className="px-5 py-4 text-ink">{row.travelLabel}</td>
                    <td className="px-5 py-4">
                      <span className={statusBadgeClass(row.status)}>{row.statusLabel}</span>
                    </td>
                    <td className="px-5 py-4 text-muted">{row.submittedLabel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="mt-6 grid gap-4 lg:hidden">
            {rows.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  className="w-full rounded-3xl border border-line bg-paper p-6 text-left shadow-[0_12px_32px_rgba(26,29,27,0.07)]"
                  onClick={() => go({ ...filters, lead: row.id })}
                >
                  <span className="flex flex-wrap items-center justify-between gap-3">
                    <span className="font-display text-2xl font-bold text-ink">{row.name}</span>
                    <span className={statusBadgeClass(row.status)}>{row.statusLabel}</span>
                  </span>
                  <span className="mt-3 block text-base leading-relaxed text-muted">{row.email}</span>
                  <span className="mt-1 block text-base text-ink">{row.phone}</span>
                  <span className="mt-3 block text-base text-ink">
                    {row.routeTitle} · {row.vehicleLabel}
                  </span>
                  <span className="mt-1 block text-base leading-relaxed text-muted">
                    Group {row.partyLabel} · {row.travelLabel}
                  </span>
                  <span className="mt-2 block text-base text-muted">{row.submittedLabel}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {total > pageSize ? (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-base leading-relaxed text-muted">
            Page {page} of {pages}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              className="min-h-11 rounded-md border border-line px-5 text-base font-medium text-ink disabled:opacity-40"
              disabled={page <= 1}
              onClick={() => go({ ...filters, page: page - 1, lead: undefined })}
            >
              Previous
            </button>
            <button
              type="button"
              className="min-h-11 rounded-md border border-line px-5 text-base font-medium text-ink disabled:opacity-40"
              disabled={page >= pages}
              onClick={() => go({ ...filters, page: page + 1, lead: undefined })}
            >
              Next
            </button>
          </div>
        </div>
      ) : null}

      {openLead ? (
        <LeadDrawer lead={openLead} canUpdate={canUpdate} onClose={() => go({ ...filters, lead: undefined })} />
      ) : null}
    </div>
  )
}

function LeadDrawer({ lead, canUpdate, onClose }: { lead: DeskLead; canUpdate: boolean; onClose: () => void }) {
  const router = useRouter()
  const closeRef = useRef<HTMLButtonElement>(null)
  const [status, setStatus] = useState(lead.status)
  const serverVersion = `${lead.id}:${lead.status}:${lead.notes.length}`
  const [syncedVersion, setSyncedVersion] = useState(serverVersion)
  if (syncedVersion !== serverVersion) {
    setSyncedVersion(serverVersion)
    setStatus(lead.status)
  }
  const [note, setNote] = useState("")
  const [message, setMessage] = useState("")
  const [ok, setOk] = useState(false)
  const [pending, setPending] = useState(false)

  const closeOnEscape = useEffectEvent(() => onClose())
  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeOnEscape()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [lead.id])

  async function save() {
    setPending(true)
    const body = new FormData()
    body.set("id", lead.id)
    body.set("status", status)
    body.set("note", note)
    try {
      const result = await updateEnquiryAction({ message: "", ok: false }, body)
      setMessage(result.message)
      setOk(result.ok)
      if (result.ok) {
        setNote("")
        router.refresh()
      }
    } catch {
      setOk(false)
      setMessage("The enquiry could not be updated.")
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[rgba(26,29,27,0.35)]" role="presentation" onMouseDown={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="lead-drawer-title"
        className="h-full w-full max-w-xl overflow-y-auto border-l border-line bg-paper p-6 shadow-[0_18px_50px_rgba(26,29,27,0.12)] sm:p-8"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold tracking-wide text-alpine uppercase">{lead.kindLabel}</p>
            <h2 id="lead-drawer-title" className="mt-2 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              {lead.name}
            </h2>
          </div>
          <button ref={closeRef} type="button" className="min-h-12 text-base font-medium text-alpine-deep" onClick={onClose}>
            Close
          </button>
        </div>
        <dl className="mt-6 grid gap-4 text-base">
          <Detail label="Email" value={lead.email} />
          <Detail label="Phone / WhatsApp" value={lead.phone} />
          <Detail label="Route" value={lead.routeTitle} />
          <Detail label="Vehicle" value={lead.vehicleLabel} />
          <Detail label="Group size" value={lead.partyLabel} />
          <Detail label="Travel date" value={lead.travelLabel} />
          <Detail label="Submitted" value={lead.submittedLabel} />
        </dl>
        <p className="mt-6 whitespace-pre-wrap text-base text-ink">{lead.message || "No message was stored."}</p>

        <h3 className="mt-8 font-display text-2xl font-bold text-ink">Internal notes</h3>
        {lead.notes.length === 0 && !lead.legacyNote ? (
          <p className="mt-3 text-base leading-relaxed text-muted">No desk notes yet.</p>
        ) : (
          <ol className="mt-4 grid gap-3">
            {lead.legacyNote ? (
              <li className="rounded-2xl border border-line bg-canvas px-4 py-3">
                <p className="text-base font-semibold text-muted">Earlier note</p>
                <p className="mt-1 whitespace-pre-wrap text-base text-ink">{lead.legacyNote}</p>
              </li>
            ) : null}
            {lead.notes.map((item) => (
              <li key={item.id} className="rounded-2xl border border-line px-4 py-3">
                <p className="text-base font-semibold text-muted">
                  {item.authorName} · {item.atLabel}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-base text-ink">{item.body}</p>
              </li>
            ))}
          </ol>
        )}

        {canUpdate ? (
          <div className="mt-6 grid gap-4">
            <label className="flex flex-col gap-2 text-base font-semibold text-ink">
              Status
              <select name="status" value={status} className={field} onChange={(event) => setStatus(event.target.value)}>
                {ENQUIRY_STATUSES.map((item) => (
                  <option key={item} value={item}>
                    {STATUS_LABEL[item]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-base font-semibold text-ink">
              Add a note
              <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={4} className={`${field} min-h-32 py-3`} />
            </label>
            {message ? <p className={`text-base ${ok ? "text-alpine-deep" : "text-danger"}`}>{message}</p> : null}
            <button
              type="button"
              disabled={pending}
              className="min-h-11 rounded-md bg-alpine px-6 text-base font-medium text-white hover:bg-alpine-deep disabled:opacity-60"
              onClick={() => void save()}
            >
              {pending ? "Saving…" : "Save lead"}
            </button>
          </div>
        ) : (
          <p className="mt-6 text-base leading-relaxed text-muted">This desk role can read the lead. Status and notes need an ops admin or expedition lead.</p>
        )}
      </aside>
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-base font-semibold text-muted">{label}</dt>
      <dd className="text-base text-ink">{value}</dd>
    </div>
  )
}
