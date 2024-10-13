export interface Subscription {
  id: string
  isSubscribed: boolean
  app: {
    id: string
    name: string
    image: string | null
  }
  game: {
    id: string
    name: string
    image: string | null
  }
}
