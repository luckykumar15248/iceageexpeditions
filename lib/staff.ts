import { type StaffRole } from "@/app/generated/prisma/client"
import { getPrisma } from "@/lib/db"
import { DomainError, DomainErrorCode } from "@/lib/errors"

export const StaffPermission = {
  departureTransition: "departure.transition",
  bookingCancel: "booking.cancel",
  manifestRead: "manifest.read",
  medicalRead: "medical.read",
  catalogWrite: "catalog.write",
  enquiryUpdate: "enquiry.update",
} as const

export type StaffPermission = (typeof StaffPermission)[keyof typeof StaffPermission]

const GRANTS: Record<StaffRole, readonly StaffPermission[]> = {
  OPS_ADMIN: [
    StaffPermission.departureTransition,
    StaffPermission.bookingCancel,
    StaffPermission.manifestRead,
    StaffPermission.medicalRead,
    StaffPermission.catalogWrite,
    StaffPermission.enquiryUpdate,
  ],
  EXPEDITION_LEAD: [
    StaffPermission.departureTransition,
    StaffPermission.manifestRead,
    StaffPermission.medicalRead,
    StaffPermission.catalogWrite,
    StaffPermission.enquiryUpdate,
  ],
  GUIDE: [StaffPermission.manifestRead],
  FINANCE: [StaffPermission.bookingCancel, StaffPermission.manifestRead],
  VIEWER: [StaffPermission.manifestRead],
}

export type StaffActor = {
  id: string
  role: StaffRole
  isActive: boolean
}

export function staffRoleLabel(role: StaffRole): string {
  switch (role) {
    case "OPS_ADMIN":
      return "Ops admin"
    case "EXPEDITION_LEAD":
      return "Expedition lead"
    case "GUIDE":
      return "Guide"
    case "FINANCE":
      return "Finance"
    case "VIEWER":
      return "Viewer"
  }
}

export function staffHasPermission(role: StaffRole, permission: StaffPermission): boolean {
  return GRANTS[role].includes(permission)
}

export function assertStaffPermission(staff: StaffActor, permission: StaffPermission): void {
  if (!staff.isActive) {
    throw new DomainError(DomainErrorCode.STAFF_INACTIVE, "Staff account is inactive")
  }
  if (!staffHasPermission(staff.role, permission)) {
    throw new DomainError(DomainErrorCode.STAFF_FORBIDDEN, "Staff role cannot perform this action")
  }
}

export async function requireStaff(staffId: string, permission: StaffPermission): Promise<StaffActor> {
  const staff = await getPrisma().staffUser.findUnique({
    where: { id: staffId },
    select: { id: true, role: true, isActive: true },
  })
  if (!staff) {
    throw new DomainError(DomainErrorCode.STAFF_NOT_FOUND, "Staff account was not found")
  }
  assertStaffPermission(staff, permission)
  return staff
}
