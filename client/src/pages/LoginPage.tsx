import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { LoginSchema, LoginInput } from '../../../shared/schemas'
import { useAuth } from '../hooks/useAuth'
import { api } from '../lib/api'
import { useState } from 'react'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
  })

  const onSubmit = async (values: LoginInput) => {
    setServerError('')
    try {
      const { data } = await api.post('/auth/login', values)
      login(data.data.token, data.data.user)
      navigate(data.data.user.role === 'coach' ? '/coach' : '/athlete')
    } catch (err: any) {
      setServerError(err.response?.data?.error ?? 'Login failed')
    }
  }

  return (
    <div className="min-h-screen bg-[#0f0f13] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#FFD300]/10 border border-[#FFD300]/20 mb-4">
            <svg className="w-6 h-6 text-[#FFD300]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-white">Welcome back</h1>
          <p className="text-slate-400 text-sm mt-1">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-300 mb-1.5">Email</label>
            <input
              {...register('email')}
              type="email"
              placeholder="you@example.com"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-[#FFD300]/50 focus:bg-white/8 transition-all"
            />
            {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-1.5">Password</label>
            <input
              {...register('password')}
              type="password"
              placeholder="••••••••"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-[#FFD300]/50 transition-all"
            />
            {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
          </div>

          {serverError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
              {serverError}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#FFD300] hover:bg-[#e6be00] disabled:opacity-50 text-[#0f0f13] font-medium py-3 rounded-xl transition-colors"
          >
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-slate-400 text-sm mt-6">
          No account?{' '}
          <Link to="/register" className="text-[#FFD300] hover:text-[#FFD300] transition-colors">
            Register
          </Link>
        </p>
      </div>
    </div>
  )
}
