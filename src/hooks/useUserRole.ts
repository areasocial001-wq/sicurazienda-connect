import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'

export type UserRole = 'admin' | 'user' | 'contabilita' | 'area_tecnica' | 'gestione_corsi' | 'consulenti_tecnici' | null

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
        // Prefer RPC (SECURITY DEFINER) to avoid RLS/policy issues on user_roles
        const { data: rpcRole, error: rpcError } = await supabase.rpc('get_user_role', {
          user_uuid: user.id,
        })

        if (!rpcError && rpcRole) {
          setRole(rpcRole)
          return
        }

        // Fallback to direct table read (kept for backwards compatibility)
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
  const isContabilita = role === 'contabilita'
  const isAreaTecnica = role === 'area_tecnica'
  const isGestioneCorsi = role === 'gestione_corsi'
  const isConsulentiTecnici = role === 'consulenti_tecnici'
  const isAreaAziendale = ['contabilita', 'area_tecnica', 'gestione_corsi', 'consulenti_tecnici'].includes(role || '')

  const getRoleDisplayName = () => {
    switch (role) {
      case 'admin': return 'Amministratore'
      case 'contabilita': return 'Contabilità'
      case 'area_tecnica': return 'Area Tecnica'
      case 'gestione_corsi': return 'Gestione Corsi'
      case 'consulenti_tecnici': return 'Consulenti Tecnici'
      case 'user': return 'Utente'
      default: return 'Non definito'
    }
  }

  return {
    role,
    loading,
    isAdmin,
    isUser,
    isContabilita,
    isAreaTecnica,
    isGestioneCorsi,
    isConsulentiTecnici,
    isAreaAziendale,
    getRoleDisplayName,
  }
}