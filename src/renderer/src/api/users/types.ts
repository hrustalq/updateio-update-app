export interface User {
  id: string

  is_bot: boolean
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
  is_premium?: boolean

  allows_write_to_pm?: boolean

  added_to_attachment_menu?: boolean

  apiKey: string

  role: Role
}

export enum Role {
  ADMIN = 'ADMIN',
  USER = 'USER',
  GUEST = 'GUEST'
}
