const Joi = require('joi');


const password_regex = "/(?=.*[a-z])(?=.*[A-Z])(?=.*d)(?=.*[$@$!#.])[A-Za-zd$@$!%*?&.]{8,20}/"

const schema = Joi.object({

  new_password: Joi.string()
      .min(6)
      .pattern(RegExp(password_regex))
      .required(),

  new_password_confirm: Joi.ref('new_password'),

})
.with('new_password', 'new_password_confirm')

exports.passwordUpdateSchema = schema
