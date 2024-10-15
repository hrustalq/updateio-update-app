import createFetchClient from 'openapi-fetch'
import createClient from 'openapi-react-query'
import type { paths } from '@renderer/lib/api/v1'

const fetchClient = createFetchClient<paths>({
  baseUrl: import.meta.env.VITE_API_URL,
  credentials: 'include',
  headers: {
    'Access-Control-Allow-Credentials': true
  }
})
const $api = createClient(fetchClient)

export default $api
