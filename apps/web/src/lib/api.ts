import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken')
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      const url = err.config?.url || ''
      const path = window.location.pathname
      const isCheckout = path.startsWith('/checkout')
      const isLogin    = path.startsWith('/auth/login')
      const isAdmin    = path.startsWith('/admin')
      const isMerchant = path.startsWith('/merchant')
      const is2FA      = url.includes('/auth/2fa') || url.includes('/auth/login')

      // Nicht ausloggen bei: 2FA, Login, Checkout, Admin, Merchant
      if (!isCheckout && !isLogin && !is2FA && !isAdmin && !isMerchant) {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
      }
    }
    return Promise.reject(err)
  }
)

export const authApi = {
  register:       (data: any)    => api.post('/auth/register', data),
  login:          (data: any)    => api.post('/auth/login', data),
  me:             ()             => api.get('/auth/me'),
  logout:         ()             => api.post('/auth/logout'),
  becomeMerchant: (data: any)    => api.post('/auth/become-merchant', data),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  verifyEmail:    (token: string) => api.get(`/auth/verify-email/${token}`),
}

export const productsApi = {
  list:        (params?: any)    => api.get('/products', { params }),
  detail:      (id: string)      => api.get(`/products/${id}`),
  create:      (data: any)       => api.post('/products', data),
  update:      (id: string, data: any) => api.patch(`/products/${id}`, data),
  uploadImages: (id: string, files: FormData) =>
    api.post(`/products/${id}/images`, files, { headers: { 'Content-Type': 'multipart/form-data' } }),
  publish:     (id: string)      => api.post(`/products/${id}/publish`),
  myProducts:  ()                => api.get('/products/merchant/my-products'),
}

export const rentalsApi = {
  checkAvailability: (params: { productVariantId: string; startDate: string; endDate: string }) =>
    api.get('/rentals/availability', { params }),
  create:     (data: any)        => api.post('/rentals', data),
  myRentals:  ()                 => api.get('/rentals/my-rentals'),
  detail:     (id: string)       => api.get(`/rentals/${id}`),
  processReturn: (id: string, data: any) => api.patch(`/rentals/${id}/return`, data),
}

export const ordersApi = {
  myOrders:   ()                 => api.get('/orders/my-orders'),
  myMerchantOrders: ()           => api.get('/orders/merchant-orders'),
  detail:     (id: string)       => api.get(`/orders/${id}`),
  cancel:     (id: string)       => api.post(`/orders/${id}/cancel`),
  updateStatus: (id: string, status: string) => api.patch(`/orders/${id}/status`, { status }),
}

export const paymentsApi = {
  createIntent:  (orderId: string) => api.post('/payments/create-intent', { orderId }),
  payout:        (orderId: string) => api.post(`/payments/payout/${orderId}`),
  refund:        (orderId: string, reason: string) => api.post(`/payments/refund/${orderId}`, { reason }),
}

export const commissionsApi = {
  merchantStats:  () => api.get('/commissions/merchant-stats'),
  merchantPayouts: () => api.get('/commissions/merchant-payouts'),
  adminReport:    () => api.get('/commissions/admin-report'),
}

// Extra helper
export const getProductByVariant = (variantId: string) =>
  api.get(`/products/variant/${variantId}`)

export const wishlistApi = {
  getWishlist:   ()                  => api.get('/wishlist'),
  toggle:        (productId: string) => api.post(`/wishlist/${productId}/toggle`),
  isSaved:       (productId: string) => api.get(`/wishlist/${productId}/status`),
  batchStatus:   (productIds: string[]) => api.post('/wishlist/batch-status', { productIds }),
  remove:        (productId: string) => api.delete(`/wishlist/${productId}`),
}
