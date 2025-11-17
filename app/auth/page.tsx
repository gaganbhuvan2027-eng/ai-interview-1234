"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { createInstitutionAdmin } from "@/app/actions/institution-login"

export default function AuthPage() {
  const router = useRouter()
  const supabase = createClient()
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("") // Added name state for signup
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [guestLoading, setGuestLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [institutionLoading, setInstitutionLoading] = useState(false)
  const [showInstitutionLogin, setShowInstitutionLogin] = useState(false)
  const [institutionEmail, setInstitutionEmail] = useState("")
  const [institutionPassword, setInstitutionPassword] = useState("")

  // Sample institution list - can be fetched from your backend
  const institutions = [
    { id: "iit", name: "IIT Delhi", domain: "iitd.ac.in" },
    { id: "delhi-uni", name: "Delhi University", domain: "du.ac.in" },
    { id: "manipal", name: "Manipal University", domain: "manipal.edu" },
    { id: "jnu", name: "Jawaharlal Nehru University", domain: "jnu.ac.in" },
    { id: "iit-bombay", name: "IIT Bombay", domain: "iitb.ac.in" },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      if (!email || !password) {
        setError("Please fill in all fields")
        setLoading(false)
        return
      }

      if (!isLogin && !name) {
        setError("Please enter your name")
        setLoading(false)
        return
      }

      if (password.length < 6) {
        setError("Password must be at least 6 characters")
        setLoading(false)
        return
      }

      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error

        await new Promise((resolve) => setTimeout(resolve, 500))
        window.location.href = "/dashboard"
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: {
              email: email,
              name: name,
            },
          },
        })
        if (error) throw error

        if (data.user) {
          const { error: profileError } = await supabase.from("users").upsert({
            id: data.user.id,
            email: email,
            name: name,
            user_type: "user",
            preferences: {
              onboarding_completed: false,
            },
          })

          if (profileError) {
            console.log("[v0] Error saving user profile:", profileError)
          }
        }

        if (data.user && data.session) {
          await new Promise((resolve) => setTimeout(resolve, 500))
          window.location.href = "/onboarding"
        } else {
          setError("Account created! Please check your email to confirm your account, then login.")
          setIsLogin(true) // Switch to login tab
        }
      }
    } catch (err: any) {
      setError(err.message || "An error occurred. Please try again.")
      console.log("[v0] Auth error:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setError("")
    setGoogleLoading(true)

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      })

      if (error) throw error
    } catch (err: any) {
      setError(err.message || "Failed to sign in with Google. Please try again.")
      console.log("[v0] Google OAuth error:", err)
      setGoogleLoading(false)
    }
  }

  const handleInstitutionSignIn = async () => {
    setError("")
    setInstitutionLoading(true)

    try {
      if (!institutionEmail || !institutionPassword) {
        setError("Please fill in all institution login fields")
        setInstitutionLoading(false)
        return
      }

      if (institutionPassword.length < 6) {
        setError("Password must be at least 6 characters")
        setInstitutionLoading(false)
        return
      }

      console.log("[v0] Starting institution admin login...")

      const result = await createInstitutionAdmin(institutionEmail, institutionPassword)

      if (!result.success) {
        throw new Error(result.error || "Failed to create institution admin account")
      }

      console.log("[v0] Institution admin account ready, signing in...")

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: result.email!,
        password: result.password!,
      })

      if (signInError) {
        console.log("[v0] Institution sign-in error:", signInError)
        throw signInError
      }

      console.log("[v0] Institution admin login successful")

      await new Promise((resolve) => setTimeout(resolve, 1000))

      console.log("[v0] Redirecting to institution dashboard...")

      window.location.href = "/institution-dashboard"
    } catch (err: any) {
      setError(err.message || "Institution login failed. Please try again.")
      console.log("[v0] Institution login error:", err)
    } finally {
      setInstitutionLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-white via-white to-blue-50 pointer-events-none" />

      {/* Auth Card */}
      <div className="relative w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
          {/* Logo and Tagline */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">HireMind</h1>
            <p className="text-gray-600 text-sm">Master Every Interview with AI</p>
          </div>

          {/* Showing institution login form instead of tabs when showInstitutionLogin is true */}
          {!showInstitutionLogin ? (
            <>
              {/* Regular Login/Signup Tabs */}
              <div className="flex gap-2 mb-8 bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => {
                    setIsLogin(true)
                    setError("")
                  }}
                  className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
                    isLogin ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Login
                </button>
                <button
                  onClick={() => {
                    setIsLogin(false)
                    setError("")
                  }}
                  className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
                    !isLogin ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Signup
                </button>
              </div>

              {/* Error/Success Message */}
              {error && (
                <div
                  className={`mb-4 p-3 border rounded-lg text-sm ${
                    error.includes("check your email") || error.includes("Account created")
                      ? "bg-green-50 border-green-200 text-green-700"
                      : "bg-red-50 border-red-200 text-red-700"
                  }`}
                >
                  {error}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4 mb-6">
                {!isLogin && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your full name"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    required
                  />
                </div>

                {/* Primary Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 px-4 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-medium rounded-lg hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Loading..." : isLogin ? "Login" : "Create Account"}
                </button>
              </form>

              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
                className="w-full py-2 px-4 mb-3 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-all flex items-center justify-center gap-3"
              >
                {googleLoading ? (
                  "Loading..."
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 2.78-3.5 5.11-3.5z"
                      />
                    </svg>
                    Continue with Google
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowInstitutionLogin(true)
                  setError("")
                  setInstitutionEmail("")
                  setInstitutionPassword("")
                }}
                className="w-full py-2 px-4 mb-3 bg-white border border-blue-300 text-blue-700 font-medium rounded-lg hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
                </svg>
                Institution Admin Login
              </button>

              {/* Forgot Password Link */}
              {isLogin && (
                <div className="text-center mt-6">
                  <Link href="#" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                    Forgot Password?
                  </Link>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Institution Login Form */}
              <button
                onClick={() => {
                  setShowInstitutionLogin(false)
                  setError("")
                  setInstitutionEmail("")
                  setInstitutionPassword("")
                }}
                className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>

              <h2 className="text-2xl font-bold text-gray-900 mb-6">Institution Admin Login</h2>

              {/* Error Message */}
              {error && (
                <div className="mb-4 p-3 border rounded-lg text-sm bg-red-50 border-red-200 text-red-700">{error}</div>
              )}

              {/* Institution Login Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleInstitutionSignIn()
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Institution Email</label>
                  <input
                    type="email"
                    value={institutionEmail}
                    onChange={(e) => setInstitutionEmail(e.target.value)}
                    placeholder="you@institution.edu"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                  <input
                    type="password"
                    value={institutionPassword}
                    onChange={(e) => setInstitutionPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={institutionLoading}
                  className="w-full py-2 px-4 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-medium rounded-lg hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {institutionLoading ? "Signing In..." : "Sign In"}
                </button>
              </form>
            </>
          )}

          {/* Back to Home */}
          <button
            type="button"
            onClick={() => router.push("/")}
            className="w-full mt-4 py-2 px-4 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-all"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  )
}
