'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export default function MerchantOnboardingPage() {
  const { user, loadUser } = useAuthStore()
  const router = useRouter()
  const [shopName, setShopName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (user?.role === 'merchant') {
    router.push('/merchant/dashboard')
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      await authApi.becomeMerchant({ shopName })
      await loadUser()
      router.push('/merchant/dashboard')
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to create merchant profile')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-5" style={{ background: '#fdf8f8' }}>
      <div className="w-full max-w-lg">
        <div className="text-center mb-12">
          <div className="w-16 h-16 flex items-center justify-center mx-auto mb-6" style={{ background: '#f1edec' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 32, color: '#9E896A' }}>storefront</span>
          </div>
          <h1 className="font-serif text-3xl font-bold mb-3">Become a Merchant</h1>
          <p className="text-secondary text-sm max-w-sm mx-auto leading-relaxed">
            Join My Dressa and start renting and selling your fashion pieces to thousands of customers.
          </p>
        </div>

        <div className="bg-white border border-outline-variant p-8 mb-8">
          <div className="grid grid-cols-3 gap-4 mb-8 pb-8 border-b border-outline-variant text-center">
            {[
              { icon: 'checkroom', label: 'List pieces' },
              { icon: 'payments', label: 'Earn revenue' },
              { icon: 'star', label: '10% commission' },
            ].map(({ icon, label }) => (
              <div key={icon}>
                <div className="w-10 h-10 flex items-center justify-center mx-auto mb-2" style={{ background: '#f1edec' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#9E896A' }}>{icon}</span>
                </div>
                <p className="text-xs font-semibold text-secondary">{label}</p>
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Shop Name"
              value={shopName}
              onChange={e => setShopName(e.target.value)}
              placeholder="Marias Vintage Mode"
              required
            />
            {error && <div className="px-4 py-3 text-sm text-error bg-error-container">{error}</div>}
            <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">
              Create My Shop
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-secondary">
          By creating a shop you agree to our{' '}
          <a href="/merchant-terms" className="text-primary underline">Merchant Terms</a>.
          Platform fee: 10% on rentals, 15% on sales.
        </p>
      </div>
    </div>
  )
}
