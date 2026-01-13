import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { type EmailOtpType } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const AuthConfirm = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const params = useMemo(() => {
    const sp = new URLSearchParams(window.location.search);
    return {
      token_hash: sp.get("token_hash"),
      type: sp.get("type"),
      next: sp.get("next") || "/",
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const { token_hash, type, next } = params;
      if (!token_hash || !type) {
        setStatus("error");
        setErrorMessage("Link non valido o incompleto.");
        return;
      }

      const { error } = await supabase.auth.verifyOtp({
        token_hash,
        type: type as EmailOtpType,
      });

      if (cancelled) return;

      if (error) {
        setStatus("error");
        setErrorMessage(error.message);
        return;
      }

      setStatus("success");
      // piccola attesa per rendere l'UI più chiara
      setTimeout(() => navigate(next), 250);
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [navigate, params]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Conferma in corso…</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {status === "loading" && (
            <p className="text-sm text-muted-foreground">Stiamo verificando il link, attendi.</p>
          )}

          {status === "success" && (
            <p className="text-sm text-muted-foreground">Verifica completata. Reindirizzamento…</p>
          )}

          {status === "error" && (
            <>
              <p className="text-sm text-destructive">{errorMessage ?? "Errore durante la verifica."}</p>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => navigate("/")}>Torna alla Home</Button>
                <Button onClick={() => navigate("/reset-password")}>Reimposta password</Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthConfirm;
