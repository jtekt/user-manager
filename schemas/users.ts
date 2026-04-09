import Joi from "joi"

export const newUserSchema = Joi.object({
  email_address: Joi.string().email({}),
  username: Joi.string().min(2).max(100),
  password: Joi.string().pattern(new RegExp("^[a-zA-Z0-9]{3,30}$")).required(),
  password_confirm: Joi.ref("password"),
}).or("email_address", "username")

const user_update = {
  // Fields that can be edited by regular users
  avatar_src: Joi.string().allow("").max(500),
  website: Joi.string().allow("").max(500),

  // Naming
  display_name: Joi.string().min(2).max(100),

  first_name: Joi.string().min(2).max(100),
  last_name: Joi.string().min(2).max(100),
  family_name: Joi.string().min(2).max(100),

  name_kanji: Joi.string().min(2).max(100),
  first_name_kanji: Joi.string().min(2).max(100),
  family_name_kanji: Joi.string().min(2).max(100),

  name_romaji: Joi.string().min(2).max(100),
  first_name_romaji: Joi.string().min(2).max(100),
  family_name_romaji: Joi.string().min(2).max(100),

  name_katakana: Joi.string().min(2).max(100),
  first_name_katakana: Joi.string().min(2).max(100),
  family_name_katakana: Joi.string().min(2).max(100),
}

const user_admin_update = {
  // Fields that can be edited by administrators
  isAdmin: Joi.boolean(),
  locked: Joi.boolean(),
  activated: Joi.boolean(),

  role: Joi.string().min(2).max(100),
}

export const userUpdateSchema = Joi.object(user_update)
export const userAdminUpdateSchema = Joi.object({
  ...user_update,
  ...user_admin_update,
})
