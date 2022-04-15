const Joi = require('joi');

const schema = Joi.object({

  new_password: Joi.string()
      .min(6)
      .pattern(new RegExp('^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$'))
      .required(),

  new_password_confirm: Joi.ref('new_password'),

})
.with('new_password', 'new_password_confirm')

exports.passwordUpdateSchema = schema
