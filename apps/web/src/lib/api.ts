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

// Verhindert parallele Refresh-Aufrufe (nur einer gleichzeitig)
let isRefreshing = false
let refreshQueue: Array<(token: string | null) => void> = []

function onRefreshed(token: string | null) {
  refreshQueue.forEach((cb) => cb(token))
  refreshQueue = []
}

async function tryRefreshToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null
  const refreshToken = localStorage.getItem('refreshToken')
  if (!refreshToken) return null
  try {
    // Eigener axios-Aufruf OHNE Interceptor, damit kein 401-Kreis entsteht
    const res = await axios.post(`${API_URL}/auth/refresh`, { refreshToken })
    const access = res.data?.accessToken as string | undefined
    const newRefresh = res.data?.refreshToken as string | undefined
    if (access && newRefresh) {
      localStorage.setItem('accessToken', access)
      localStorage.setItem('refreshToken', newRefresh)
      return access
    }
    return null
  } catch {
    return null
  }
}

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config || {}
    const status = err.response?.status
    const url = original.url || ''

    // Auth-Flow-Aufrufe NICHT automatisch erneuern
    const isAuthFlow =
      url.includes('/auth/login') ||
      url.includes('/auth/2fa') ||
      url.includes('/auth/change-password') ||
      url.includes('/auth/register') ||
      url.includes('/auth/refresh')

    if (
      status === 401 &&
      typeof window !== 'undefined' &&
      !isAuthFlow &&
      !original._retried
    ) {
      // Läuft schon ein Refresh? Dann anstellen und warten.
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push((token) => {
            if (token) {
              original._retried = true
              original.headers = original.headers || {}
              original.headers.Authorization = `Bearer ${token}`
              resolve(api(original))
            } else {
              reject(err)
            }
          })
        })
      }

      original._retried = true
      isRefreshing = true
      const newToken = await tryRefreshToken()
      isRefreshing = false
      onRefreshed(newToken)

      if (newToken) {
        // Ursprünglichen Request mit neuem Token wiederholen
        original.headers = original.headers || {}
        original.headers.Authorization = `Bearer ${newToken}`
        return api(original)
      }

      // Refresh fehlgeschlagen → Session beenden
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
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
  resendVerification: () => api.post('/auth/resend-verification'),
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
  confirmReturnCustomer: (id: string) => api.post(`/rentals/${id}/confirm-return-customer`),
  confirmReturnMerchant: (id: string, condition: string, notes?: string) =>
    api.post(`/rentals/${id}/confirm-return-merchant`, { condition, notes }),
  extensionOptions: (id: string) => api.get(`/rentals/${id}/extension-options`),
  requestExtension: (id: string, extraDays: number) =>
    api.post(`/rentals/${id}/extend`, { extraDays }),
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
  merchantHistory: () => api.get('/commissions/merchant-history'),
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

// Feature 1: Einstellungen (Mietdauern)
export const newsletterApi = {
  subscribe: (email: string) => api.post('/newsletter/subscribe', { email, source: 'homepage' }),
  adminSubscribers: () => api.get('/newsletter/admin/subscribers'),
}

export const supportApi = {
  lookupUser: (email: string) => api.get(`/users/support/lookup/${encodeURIComponent(email)}`),
  resendVerification: (email: string) => api.post('/users/support/resend-verification', { email }),
  verifyManually: (email: string) => api.post('/users/support/verify-manually', { email }),
}

export const adminApi = {
  notifications: () => api.get('/admin/notifications'),
}

export const settingsApi = {
  rentalDurations: () => api.get('/settings/rental-durations'),
  productColors: () => api.get('/settings/product-colors'),
  productSizes: () => api.get('/settings/product-sizes'),
  homeImages: () => api.get('/settings/home-images'),
  adminSetHomeImage: (name: string, url: string) =>
    api.put(`/settings/admin/home-images/${name}`, { url }),
  adminUploadHomeImage: (name: string, file: File) => {
    const fd = new FormData()
    fd.append('image', file)
    return api.post(`/settings/admin/home-images/${name}/upload`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  adminGetAll: () => api.get('/settings/admin/all'),
  paymentMethods: () => api.get('/settings/payment-methods'),
  adminSetPaymentMethods: (allow: boolean) =>
    api.put('/settings/admin/payment-methods', { allow }),
  adminSetRentalDurations: (durations: number[]) =>
    api.put('/settings/admin/rental-durations', { durations }),
  adminSetProductColors: (colors: string[]) =>
    api.put('/settings/admin/product-colors', { colors }),
  adminSetProductSizes: (sizes: string[]) =>
    api.put('/settings/admin/product-sizes', { sizes }),
}
