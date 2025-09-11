'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { userRegistrationSchema } from '@/lib/validations'
import { useAuthStore } from '@/stores/auth-store'
import { Trophy, Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react'

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [registrationComplete, setRegistrationComplete] = useState(false)
  const router = useRouter()
  const signUp = useAuthStore(state => state.signUp)

  const form = useForm({
    resolver: zodResolver(userRegistrationSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      displayName: ''
    }
  })

  const onSubmit = async (data) => {
    setIsLoading(true)
    try {
      const result = await signUp(data.email, data.password, {
        username: data.username,
        display_name: data.displayName || data.username,
      })
      
      if (result.success) {
        setRegistrationComplete(true)
        // Auto redirect after 3 seconds
        setTimeout(() => {
          router.push('/tournaments')
        }, 3000)
      } else {
        form.setError('root', { message: result.error })
      }
    } catch (error) {
      form.setError('root', { message: 'An unexpected error occurred' })
    } finally {
      setIsLoading(false)
    }
  }

  if (registrationComplete) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold">Account Created!</h2>
            <p className="text-muted-foreground">
              Welcome to BracketForge! Your account has been created successfully.
              You'll be redirected to browse tournaments shortly.
            </p>
            <Button onClick={() => router.push('/tournaments')} className="w-full">
              Continue to Tournaments
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center space-x-2 text-primary">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Trophy className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl">BracketForge</span>
          </Link>
          <h1 className="text-2xl font-bold">Create your account</h1>
          <p className="text-muted-foreground">Join BracketForge to create and manage tournaments</p>
        </div>

        {/* Registration Form */}
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-center">Sign Up</CardTitle>
            <CardDescription className="text-center">
              Create a free account to get started
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    placeholder="username"
                    {...form.register('username')}
                    disabled={isLoading}
                  />
                  {form.formState.errors.username && (
                    <p className="text-sm text-red-500">{form.formState.errors.username.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    placeholder="Your Name"
                    {...form.register('displayName')}
                    disabled={isLoading}
                  />
                  {form.formState.errors.displayName && (
                    <p className="text-sm text-red-500">{form.formState.errors.displayName.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  {...form.register('email')}
                  disabled={isLoading}
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-red-500">{form.formState.errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a strong password"
                    {...form.register('password')}
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                {form.formState.errors.password && (
                  <p className="text-sm text-red-500">{form.formState.errors.password.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Password must contain at least 8 characters with uppercase, lowercase, and numbers
                </p>
              </div>

              {form.formState.errors.root && (
                <div className="text-sm text-red-500 text-center p-2 bg-red-50 rounded-md border border-red-200">
                  {form.formState.errors.root.message}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Account
              </Button>
            </form>

            <div className="mt-4">
              <p className="text-xs text-muted-foreground text-center">
                By creating an account, you agree to our Terms of Service and Privacy Policy
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Sign In Link */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-sm">
              <span className="text-muted-foreground">Already have an account? </span>
              <Link href="/login" className="text-primary font-medium hover:underline">
                Sign in here
              </Link>
            </div>
            <div className="text-center text-xs text-muted-foreground mt-2">
              Or continue as a guest to browse tournaments
            </div>
            <div className="mt-3">
              <Link href="/tournaments">
                <Button variant="outline" className="w-full">
                  Continue as Guest
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}