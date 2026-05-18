import axios from 'axios'

const api = axios.create({
  baseURL: (import.meta.env.VITE_API_BASE || 'http://localhost:5000') + '/api',
  timeout: 60000,
})

// Response interceptor — normalize errors
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message =
      err.response?.data?.message ||
      err.response?.data?.errors?.[0]?.msg ||
      err.message ||
      'Something went wrong'
    return Promise.reject(new Error(message))
  }
)

export default api
