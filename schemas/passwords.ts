import { z } from "zod"

export const passwordUpdateSchema = z.object({
  new_password: z.string().min(6).regex(/^[ A-Za-z0-9_@./#&+-]*$/),
  new_password_confirm: z.string(),
}).refine(data => data.new_password === data.new_password_confirm, {
  message: "Passwords do not match",
  path: ["new_password_confirm"],
})
