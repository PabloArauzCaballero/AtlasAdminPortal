import { z } from "zod";
import type { InternalUserDepartment } from "./types";

export const DEPARTMENTS = [
  "OPERATIONS",
  "RISK",
  "COLLECTIONS",
  "COMPLIANCE",
  "FINANCE",
  "SUPPORT",
  "SYSTEMS",
  "AUDIT",
  "EXECUTIVE",
] as const satisfies readonly InternalUserDepartment[];

/**
 * Fuente única de la validación del alta. Vive fuera del componente para poder
 * probar las reglas sin montar la pantalla, y para que el formulario no vuelva
 * a validar "a mano" con ifs sueltos: `zodResolver` deshabilita el submit hasta
 * que esto pasa, que es lo que evita altas a medias y dobles envíos.
 */
export const createUserSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "El correo es obligatorio.")
    .email("Ingresa un correo institucional válido."),
  fullName: z.string().trim().min(3, "El nombre completo es obligatorio."),
  department: z.enum(DEPARTMENTS),
  jobTitle: z.string().trim().optional(),
  roles: z
    .array(z.string())
    .min(1, "Selecciona al menos un rol para el nuevo usuario."),
  reason: z
    .string()
    .trim()
    .min(8, "El motivo es obligatorio y debe tener al menos 8 caracteres."),
});

export type CreateUserForm = z.infer<typeof createUserSchema>;
