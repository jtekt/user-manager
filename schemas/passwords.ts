import { z } from "zod"

export const passwordSchema = z
  .string()
  .min(6)
  .max(30)
  .regex(/^[ A-Za-z0-9_@./#&+-]+$/)

export const passwordUpdateSchema = z.object({
  new_password: passwordSchema,
  new_password_confirm: z.string(),
}).refine(data => data.new_password === data.new_password_confirm, {
  message: "Passwords do not match",
  path: ["new_password_confirm"],
})
