import { z } from "zod";
import type { InternalUserListItem, UpdateInternalUserInput } from "./types";

export const EDIT_DEPARTMENTS = [
  "OPERATIONS",
  "RISK",
  "COLLECTIONS",
  "COMPLIANCE",
  "FINANCE",
  "SUPPORT",
  "SYSTEMS",
  "AUDIT",
  "EXECUTIVE",
] as const;

export const EDIT_STATUSES = [
  "active",
  "invited",
  "suspended",
  "locked",
  "disabled",
] as const;

/**
 * Validación de la edición de usuario. La única regla dura es el motivo: toda
 * modificación (perfil o estado) queda en el log de auditoría, así que exigir un
 * motivo con sustancia es parte del contrato, no cosmética.
 */
export const editUserSchema = z.object({
  fullName: z.string().trim().min(3, "El nombre completo es obligatorio."),
  department: z.enum(EDIT_DEPARTMENTS),
  jobTitle: z.string().trim(),
  status: z.enum(EDIT_STATUSES),
  mustChangePassword: z.boolean(),
  reason: z
    .string()
    .trim()
    .min(8, "El motivo es obligatorio y debe tener al menos 8 caracteres."),
});

export type EditUserForm = z.infer<typeof editUserSchema>;

export function editUserDefaults(user: InternalUserListItem): EditUserForm {
  return {
    fullName: user.fullName,
    department: (EDIT_DEPARTMENTS as readonly string[]).includes(
      user.department ?? "",
    )
      ? (user.department as EditUserForm["department"])
      : "OPERATIONS",
    jobTitle: user.jobTitle ?? "",
    status: (EDIT_STATUSES as readonly string[]).includes(user.status)
      ? (user.status as EditUserForm["status"])
      : "active",
    mustChangePassword: Boolean(user.mustChangePassword),
    reason: "",
  };
}

/**
 * Diff contra el usuario original: solo se mandan los campos que cambiaron. El
 * backend hace un PATCH parcial, así que reenviar todo generaría entradas de
 * auditoría de campos que nadie tocó. `reason` siempre va (es el porqué del
 * cambio, no un campo del usuario).
 */
export function buildUpdatePayload(
  values: EditUserForm,
  user: InternalUserListItem,
): UpdateInternalUserInput {
  return {
    fullName: values.fullName !== user.fullName ? values.fullName : undefined,
    department:
      values.department !== user.department ? values.department : undefined,
    jobTitle:
      values.jobTitle !== (user.jobTitle ?? "") ? values.jobTitle : undefined,
    status: values.status !== user.status ? values.status : undefined,
    mustChangePassword:
      values.mustChangePassword !== Boolean(user.mustChangePassword)
        ? values.mustChangePassword
        : undefined,
    reason: values.reason.trim(),
  };
}
