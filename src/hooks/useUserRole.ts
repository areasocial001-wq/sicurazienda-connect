import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'

export type UserRole = 'admin' | 'user' | null

export function useUserRole() {
  const [role, setRole] = useState<UserRole>(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    if (!user) {
      setRole(null)
      setLoading(false)
      return
    }

    const fetchUserRole = async () => {
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single()

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching user role:', error)
          setRole('user') // Default to user role on error
        } else {
          setRole(data?.role || 'user')
        }
      } catch (error) {
        console.error('Error:', error)
        setRole('user')
      } finally {
        setLoading(false)
      }
    }

    fetchUserRole()
  }, [user])

  const isAdmin = role === 'admin'
  const isUser = role === 'user'

  return {
    role,
    loading,
    isAdmin,
    isUser,
  }
}