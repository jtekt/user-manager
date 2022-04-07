const user_editable_fields = [
  'display_name',
  'first_name',
  'family_name',
  'last_name', // Should not exist
  'name_kanji',
  'first_name_kanji',
  'family_name_kanji',
  'name_romaji',
  'first_name_romaji',
  'family_name_romaji',
  'name_katakana',
  'first_name_katakana',
  'family_name_katakana',
  'avatar_src',
]

const admin_editable_fields = [
  ...user_editable_fields,
  'isAdmin',
  'role',
  'locked',
  'employee_number', // maybe not ideal
]

exports.user_editable_fields = user_editable_fields
exports.admin_editable_fields = admin_editable_fields
