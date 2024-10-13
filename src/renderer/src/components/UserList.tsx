import React, { useState, useEffect } from 'react'
import { database } from '../utils/database'

interface User {
  id: number
  email: string
  name: string | null
}

export const UserList: React.FC = () => {
  const [users, setUsers] = useState<User[]>([])
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserName, setNewUserName] = useState('')

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      const fetchedUsers = await database.getUsers()
      setUsers(fetchedUsers)
    } catch (error) {
      console.error('Failed to load users:', error)
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await database.createUser({ email: newUserEmail, name: newUserName })
      setNewUserEmail('')
      setNewUserName('')
      loadUsers() // Reload the user list
    } catch (error) {
      console.error('Failed to create user:', error)
    }
  }

  return (
    <div>
      <h2>Users</h2>
      <ul>
        {users.map((user) => (
          <li key={user.id}>
            {user.email} - {user.name}
          </li>
        ))}
      </ul>
      <form onSubmit={handleCreateUser}>
        <input
          type="email"
          value={newUserEmail}
          onChange={(e) => setNewUserEmail(e.target.value)}
          placeholder="Email"
          required
        />
        <input
          type="text"
          value={newUserName}
          onChange={(e) => setNewUserName(e.target.value)}
          placeholder="Name"
        />
        <button type="submit">Add User</button>
      </form>
    </div>
  )
}
