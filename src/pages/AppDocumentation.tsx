import { useState } from "react";
import { jsPDF } from "jspdf";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

const AppDocumentation = () => {
  const [generating, setGenerating] = useState(false);

  const generatePDF = () => {
    setGenerating(true);
    
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      const maxWidth = pageWidth - margin * 2;
      let y = 20;

      const addTitle = (text: string, size: number = 16) => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.setFontSize(size);
        doc.setFont("helvetica", "bold");
        doc.text(text, margin, y);
        y += size * 0.5 + 4;
      };

      const addSubtitle = (text: string) => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(text, margin, y);
        y += 8;
      };

      const addText = (text: string) => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const lines = doc.splitTextToSize(text, maxWidth);
        doc.text(lines, margin, y);
        y += lines.length * 5 + 3;
      };

      const addBullet = (text: string) => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const lines = doc.splitTextToSize("• " + text, maxWidth - 5);
        doc.text(lines, margin + 5, y);
        y += lines.length * 5 + 2;
      };

      const addSpace = (space: number = 5) => { y += space; };

      // TITLE
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text("SicurAzienda", pageWidth / 2, y, { align: "center" });
      y += 10;
      doc.setFontSize(14);
      doc.setFont("helvetica", "normal");
      doc.text("Documentazione Applicazione", pageWidth / 2, y, { align: "center" });
      y += 8;
      doc.setFontSize(10);
      doc.text(`Generato il: ${new Date().toLocaleDateString("it-IT")}`, pageWidth / 2, y, { align: "center" });
      y += 15;

      // OVERVIEW
      addTitle("1. Panoramica");
      addText("SicurAzienda e una piattaforma digitale per la gestione della sicurezza sul lavoro. L'applicazione offre servizi di consulenza, gestione documentale e formazione per aziende.");
      addText("Slogan: \"L'azione di tanti per la sicurezza di tutti\"");
      addSpace(10);

      // HOME
      addTitle("2. Home Page");
      addText("La pagina principale presenta:");
      addBullet("Hero Section con gradiente brand giallo-rosso");
      addBullet("4 servizi principali: Nuovo Cliente, Gia Cliente, Area Documenti, Dashboard Admin");
      addBullet("Contatti rapidi: email, telefono, orari, indirizzo");
      addSpace(10);

      // CLIENTI
      addTitle("3. Gestione Clienti");
      addSubtitle("Nuovo Cliente (/new-client)");
      addBullet("Form richiesta check-up gratuito");
      addBullet("Selezione servizi: DVR, Medicina del Lavoro, Formazione, HACCP, Privacy");
      addBullet("Validazione codice fiscale italiano in tempo reale");
      addBullet("Selettori per tipo contratto e mansione");
      addBullet("Invio email automatico + salvataggio database");
      addSpace(5);
      addSubtitle("Gia Cliente (/existing-client)");
      addBullet("Form semplificato per clienti esistenti");
      addBullet("Richiesta assistenza e supporto");
      addSpace(10);

      // DOCUMENTI
      addTitle("4. Gestione Documenti");
      addSubtitle("Area Documenti (/documents)");
      addBullet("Upload documenti personali");
      addBullet("Download documenti caricati");
      addBullet("Generazione QR Code per ogni documento");
      addBullet("Filtro per categoria");
      addSpace(5);
      addSubtitle("Attestati (/attestati)");
      addBullet("Sezione dedicata agli attestati di formazione");
      addBullet("Visualizzazione attestati assegnati dall'admin");
      addSpace(10);

      // AUTENTICAZIONE
      addTitle("5. Sistema di Autenticazione");
      addBullet("Login/Registrazione via modal");
      addBullet("Autenticazione Supabase");
      addBullet("Sessione persistente");
      addBullet("Recupero password");
      addSpace(10);

      // NEW PAGE
      doc.addPage();
      y = 20;

      // PROFILO
      addTitle("6. Profilo Utente (/profile)");
      addBullet("Visualizzazione dati profilo");
      addBullet("Bozze salvate dei form incompleti");
      addBullet("Continua modifica o elimina bozze");
      addBullet("Logout");
      addSpace(10);

      // ADMIN
      addTitle("7. Area Amministrativa");
      addSubtitle("Dashboard Admin (/admin)");
      addText("Statistiche:");
      addBullet("Documenti totali / questo mese");
      addBullet("Utenti registrati");
      addBullet("QR Code totali / questo mese / inviati via email");
      addSpace(3);
      addText("Grafici:");
      addBullet("Andamento QR code (ultimi 30 giorni)");
      addBullet("Lista QR code recenti");
      addSpace(3);
      addText("Funzionalita:");
      addBullet("Carica attestati per utente specifico");
      addBullet("Visualizza tutti i documenti con filtro per area");
      addBullet("Download/Elimina documenti");
      addBullet("Genera QR Code");
      addSpace(5);
      addSubtitle("Gestione Ruoli (/user-roles)");
      addText("Ruoli disponibili: admin, user, contabilita, area_tecnica, gestione_corsi, consulenti_tecnici");
      addSpace(10);

      // QR CODE
      addTitle("8. Sistema QR Code");
      addSubtitle("Generazione QR");
      addBullet("Modal con QR code generato");
      addBullet("Copia link negli appunti");
      addBullet("Download QR come PNG");
      addBullet("Tracciamento scansioni attivo");
      addSpace(5);
      addSubtitle("Invio Email QR");
      addBullet("Inserisci email destinatario");
      addBullet("Invio automatico via Resend");
      addBullet("Salvataggio cronologia invii");
      addSpace(5);
      addSubtitle("Cronologia QR (/qr-history)");
      addBullet("Lista tutti i QR generati");
      addBullet("Filtri: stato email, stato QR, range date");
      addBullet("Export CSV");
      addBullet("Badge stato: Attivo/Disabilitato");
      addSpace(5);
      addSubtitle("Statistiche QR (/qr-stats/:id)");
      addBullet("Scansioni totali e ultima scansione");
      addBullet("Grafico temporale scansioni");
      addBullet("Lista scansioni con tipo dispositivo (Mobile/Desktop)");
      addBullet("Toggle attiva/disabilita QR Code");
      addSpace(5);
      addSubtitle("Notifiche Real-time");
      addBullet("Toast notification quando qualcuno scansiona un tuo QR");
      addBullet("Powered by Supabase Realtime");
      addSpace(10);

      // NEW PAGE
      doc.addPage();
      y = 20;

      // DATABASE
      addTitle("9. Database (Supabase)");
      addText("Tabelle:");
      addBullet("profiles - Dati utente (nome, azienda)");
      addBullet("documents - Documenti caricati");
      addBullet("user_roles - Ruoli utente");
      addBullet("contact_requests - Richieste contatto");
      addBullet("form_drafts - Bozze form salvate");
      addBullet("qr_codes - QR code generati");
      addBullet("qr_scans - Scansioni QR tracciate");
      addSpace(10);

      // TECNOLOGIE
      addTitle("10. Stack Tecnologico");
      addBullet("Frontend: React + TypeScript + Vite");
      addBullet("Styling: Tailwind CSS + shadcn/ui");
      addBullet("Backend: Supabase (Auth, DB, Storage, Edge Functions)");
      addBullet("Email: Resend API");
      addBullet("QR Code: qrcode.react");
      addBullet("Grafici: Recharts");
      addBullet("Routing: React Router");
      addBullet("State: TanStack Query");
      addBullet("Mobile: Capacitor ready");
      addSpace(10);

      // DESIGN SYSTEM
      addTitle("11. Design System");
      addSubtitle("Colori Brand");
      addBullet("Primary (Giallo): HSL 45 100% 50%");
      addBullet("Secondary (Rosso): HSL 0 84% 55%");
      addBullet("Background: Bianco");
      addBullet("Foreground: Nero/Blu scuro");
      addSpace(5);
      addSubtitle("Gradienti");
      addBullet(".gradient-sicur - Gradiente giallo -> rosso");
      addBullet(".text-gradient - Testo con gradiente");
      addSpace(10);

      // NAVIGAZIONE
      addTitle("12. Navigazione");
      addBullet("Header: Logo, menu dropdown (Profilo, Cronologia QR, Dashboard), login");
      addBullet("Bottom Nav: Home, Nuovo Cliente, Documenti, Profilo");

      // FOOTER
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.text("SicurAzienda - Documentazione Tecnica", pageWidth / 2, 285, { align: "center" });

      // Save
      doc.save("SicurAzienda-Documentazione.pdf");
      toast.success("PDF scaricato con successo!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Errore nella generazione del PDF");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto p-4 pb-20">
        <div className="text-center mb-6">
          <FileText className="h-12 w-12 mx-auto mb-3 text-primary" />
          <h1 className="text-2xl font-bold mb-2">Documentazione App</h1>
          <p className="text-muted-foreground">
            Scarica la documentazione completa in PDF
          </p>
        </div>

        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-center">SicurAzienda</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Il PDF include tutte le funzionalita dell'applicazione, 
              il design system, lo stack tecnologico e la struttura del database.
            </p>
            
            <Button 
              className="w-full" 
              size="lg"
              onClick={generatePDF}
              disabled={generating}
            >
              {generating ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Generazione in corso...
                </>
              ) : (
                <>
                  <Download className="h-5 w-5 mr-2" />
                  Scarica PDF Documentazione
                </>
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Generato il {new Date().toLocaleDateString("it-IT")}
            </p>
          </CardContent>
        </Card>
      </main>
      
      <BottomNav />
    </div>
  );
};

export default AppDocumentation;