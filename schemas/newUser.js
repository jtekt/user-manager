const Joi = require('joi');

const schema = Joi.object({

  // username: Joi.string()
  //     .alphanum()
  //     .min(3)
  //     .max(30)
  //     .required(),

  password: Joi.string()
      .pattern(new RegExp('^[a-zA-Z0-9]{3,30}$'))
      .required(),

  password_confirm: Joi.ref('password'),

  email_address: Joi.string()
    .email({ })
    .required(),
})
.with('password', 'password_confirm')

module.exports = schema
