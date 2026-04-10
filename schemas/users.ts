import { z } from "zod"
import { passwordSchema } from "./passwords"

export const newUserSchema = z.object({
  email_address: z.string().email().optional(),
  username: z.string().min(2).max(100).optional(),
  password: passwordSchema,
  password_confirm: z.string().optional(),
}).refine(data => data.email_address || data.username, {
  message: "Either email_address or username must be provided",
}).refine(data => !data.password_confirm || data.password_confirm === data.password, {
  message: "Passwords do not match",
  path: ["password_confirm"],
})

const user_update = z.object({
  // Fields that can be edited by regular users
  avatar_src: z.string().max(500).optional(),
  website: z.string().max(500).optional(),

  // Naming
  display_name: z.string().min(2).max(100).optional(),

  first_name: z.string().min(2).max(100).optional(),
  last_name: z.string().min(2).max(100).optional(),
  family_name: z.string().min(2).max(100).optional(),

  name_kanji: z.string().min(2).max(100).optional(),
  first_name_kanji: z.string().min(2).max(100).optional(),
  family_name_kanji: z.string().min(2).max(100).optional(),

  name_romaji: z.string().min(2).max(100).optional(),
  first_name_romaji: z.string().min(2).max(100).optional(),
  family_name_romaji: z.string().min(2).max(100).optional(),

  name_katakana: z.string().min(2).max(100).optional(),
  first_name_katakana: z.string().min(2).max(100).optional(),
  family_name_katakana: z.string().min(2).max(100).optional(),
}).strict()

export const userUpdateSchema = user_update
export const userAdminUpdateSchema = user_update.extend({
  // Fields that can be edited by administrators
  isAdmin: z.boolean().optional(),
  locked: z.boolean().optional(),
  activated: z.boolean().optional(),

  role: z.string().min(2).max(100).optional(),
})
