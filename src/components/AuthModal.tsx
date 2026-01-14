import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { supabase } from '@/integrations/supabase/client'
import { buildPublicUrl } from '@/lib/siteUrl'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'

interface AuthModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function AuthModal({ open, onOpenChange }: AuthModalProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn, signUp } = useAuth()
  const { toast } = useToast()

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await signIn(email, password)

    if (error) {
      const isInvalid = (error.message || '').toLowerCase().includes('invalid login credentials')
      toast({
        title: "Errore di accesso",
        description: isInvalid ? "Email o password non corretti." : error.message,
        variant: "destructive",
      })
    } else {
      toast({
        title: "Accesso effettuato",
        description: "Benvenuto nell'area documenti!",
      })
      onOpenChange(false)
      resetForm()
    }

    setLoading(false)
  }

  const handleForgotPassword = async () => {
    if (!email) {
      toast({
        title: "Inserisci la tua email",
        description: "Scrivi l'email nel campo e poi clicca su 'Password dimenticata?'.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    const redirectTo = buildPublicUrl('/reset-password')
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
    setLoading(false)

    if (error) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      })
      return
    }

    toast({
      title: "Email inviata",
      description: "Controlla la posta (anche SPAM) per reimpostare la password.",
    })
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await signUp(email, password, fullName, companyName)
    
    if (error) {
      toast({
        title: "Errore di registrazione",
        description: error.message,
        variant: "destructive",
      })
    } else {
      toast({
        title: "Registrazione completata",
        description: "Controlla la tua email per confermare l'account",
      })
      onOpenChange(false)
      resetForm()
    }
    
    setLoading(false)
  }

  const resetForm = () => {
    setEmail('')
    setPassword('')
    setFullName('')
    setCompanyName('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Accesso Area Documenti</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Accedi</TabsTrigger>
            <TabsTrigger value="signup">Registrati</TabsTrigger>
          </TabsList>
          
          <TabsContent value="signin">
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signin-email">Email</Label>
                <Input
                  id="signin-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signin-password">Password</Label>
                <Input
                  id="signin-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="link"
                    className="px-0 h-auto"
                    onClick={handleForgotPassword}
                    disabled={loading}
                  >
                    Password dimenticata?
                  </Button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Accedendo...' : 'Accedi'}
              </Button>
            </form>
          </TabsContent>
          
          <TabsContent value="signup">
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-fullname">Nome Completo</Label>
                <Input
                  id="signup-fullname"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-company">Nome Azienda</Label>
                <Input
                  id="signup-company"
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <Input
                  id="signup-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Registrando...' : 'Registrati'}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}