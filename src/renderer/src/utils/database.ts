interface User {
  id: number
  email: string
  name: string | null
}

export const database = {
  getUsers: (): Promise<User[]> => {
    return window.database.getUsers()
  },

  createUser: (data: { email: string; name?: string }): Promise<User> => {
    return window.database.createUser(data)
  }
}
