const bcrypt = require('bcrypt')

exports.hash_password = (password_plain) => bcrypt.hash(password_plain, 10)
exports.compare_password = (password_plain, password_hashed) => bcrypt.compare(password_plain, password_hashed)




