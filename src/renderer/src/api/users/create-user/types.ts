import { Role } from '../types'

export interface CreateUserData {
  email: string
  password: string
  role: Role
}
