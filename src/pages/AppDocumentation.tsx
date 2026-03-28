import { useState } from "react";
import { jsPDF } from "jspdf";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileText, Loader2, BookOpen } from "lucide-react";
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
      addText("SicurAzienda e una piattaforma digitale per la gestione della sicurezza sul lavoro. L'applicazione offre servizi di consulenza, gestione documentale, formazione, CRM e assistente AI per aziende.");
      addText("Slogan: \"L'azione di tanti per la sicurezza di tutti\"");
      addSpace(10);

      // HOME
      addTitle("2. Home Page");
      addText("La pagina principale presenta:");
      addBullet("Hero Section con gradiente brand giallo-rosso");
      addBullet("6 servizi principali: Nuovo Cliente, Gia Cliente, Area Documenti, Dashboard Admin, CRM, Assistente AI");
      addBullet("Contatti rapidi: email, telefono, orari, indirizzo");
      addBullet("Chat flottante per assistenza rapida");
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
      addBullet("Data di scadenza documenti con promemoria");
      addBullet("Estrazione dati automatica con AI");
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
      addTitle("6. Profilo Utente (/profile)")
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
      addSubtitle("Statistiche QR Avanzate (/qr-stats/:id)");
      addBullet("Scansioni totali e ultima scansione");
      addBullet("Grafico temporale scansioni (ultimi 30 giorni)");
      addBullet("Distribuzione per dispositivo (Mobile/Tablet/Desktop)");
      addBullet("Distribuzione per sistema operativo (Windows/macOS/iOS/Android/Linux)");
      addBullet("Distribuzione oraria delle scansioni");
      addBullet("Browser utilizzati");
      addBullet("Geolocalizzazione: mappa paesi con bandiere emoji");
      addBullet("Top citta di provenienza");
      addBullet("Export statistiche in CSV");
      addBullet("Export report completo in PDF");
      addBullet("Toggle attiva/disabilita QR Code");
      addSpace(5);
      addSubtitle("Notifiche Real-time");
      addBullet("Toast notification quando qualcuno scansiona un tuo QR");
      addBullet("Powered by Supabase Realtime");
      addSpace(10);

      // CRM
      addTitle("9. Sistema CRM");
      addSubtitle("Gestione Contatti (/crm)");
      addBullet("Lista contatti con ricerca e filtri");
      addBullet("Stati: lead, prospect, cliente, inattivo");
      addBullet("Tags personalizzabili");
      addBullet("Note e cronologia interazioni");
      addBullet("Data prossimo follow-up");
      addSpace(5);
      addSubtitle("Calendario CRM (/crm/calendar)");
      addBullet("Vista settimanale interazioni");
      addBullet("Sincronizzazione Google Calendar");
      addBullet("Schedulazione appuntamenti");
      addSpace(5);
      addSubtitle("Analytics CRM (/crm/analytics)");
      addBullet("Statistiche contatti per stato");
      addBullet("Grafici andamento lead");
      addBullet("Report attivita");
      addSpace(5);
      addSubtitle("Agente AI CRM");
      addBullet("Assistente intelligente per gestione contatti");
      addBullet("Suggerimenti follow-up automatici");
      addSpace(10);

      // GESTIONE CORSI
      addTitle("10. Gestione Corsi (/corsi)");
      addText("Modulo completo per la gestione della formazione in aula, integrato con il CRM.");
      addSpace(3);
      addSubtitle("Catalogo Corsi");
      addBullet("Creazione corsi con tipo (Sicurezza, Primo Soccorso, Antincendio, RLS, Preposti, Dirigenti, Attrezzature)");
      addBullet("Durata, numero massimo partecipanti, obbligatorieta");
      addBullet("Periodo di rinnovo in mesi per gestione scadenze");
      addBullet("Ricerca e filtro per tipologia");
      addSpace(3);
      addSubtitle("Edizioni e Lezioni");
      addBullet("Programmazione edizioni con date, aula, sede e docente");
      addBullet("Codice edizione e stati: pianificata, in corso, completata, annullata");
      addBullet("Gestione lezioni con data, orario, argomento e docente");
      addBullet("Sincronizzazione automatica nel Calendario CRM");
      addSpace(3);
      addSubtitle("Iscrizioni e Presenze");
      addBullet("Iscrizione dipendenti dall'anagrafica CRM");
      addBullet("Matrice presenze interattiva per lezione");
      addBullet("Registrazione orari di ingresso e uscita");
      addBullet("Esito e punteggio per ogni iscritto");
      addSpace(3);
      addSubtitle("Attestati e Certificati");
      addBullet("Emissione attestati con data e scadenza automatica");
      addBullet("3 template disponibili: Classico, Moderno, Minimalista");
      addBullet("Anteprima in tempo reale del template scelto");
      addBullet("Personalizzazione con logo e dati aziendali (branding)");
      addBullet("Invio automatico attestato via email al dipendente o azienda");
      addSpace(3);
      addSubtitle("Registro Presenze PDF");
      addBullet("Generazione registro presenze in formato PDF stampabile");
      addBullet("Layout landscape con griglia lezioni/partecipanti");
      addBullet("Intestazione personalizzata con branding aziendale");
      addSpace(3);
      addSubtitle("Importazione Massiva");
      addBullet("Importazione catalogo corsi da file Excel");
      addBullet("Importazione iscrizioni e certificati da Excel");
      addBullet("Matching automatico con dipendenti e aziende CRM");
      addSpace(3);
      addSubtitle("Scadenzario");
      addBullet("Monitoraggio scadenze attestati in tempo reale");
      addBullet("Notifiche automatiche 30 e 7 giorni prima della scadenza");
      addBullet("Integrazione con il sistema promemoria della piattaforma");
      addSpace(3);
      addSubtitle("Branding Aziendale");
      addBullet("Upload logo aziendale per attestati e registri");
      addBullet("Configurazione dati aziendali: ragione sociale, P.IVA, C.F., indirizzo");
      addBullet("Dati di contatto: email, PEC, telefono, sito web");
      addBullet("Testo personalizzato per il footer dei documenti");
      addSpace(10);

      // ASSISTENTE AI
      addTitle("11. Assistente AI (/assistente)");
      addBullet("Chat intelligente per supporto");
      addBullet("Analisi documenti con AI");
      addBullet("Estrazione dati automatica");
      addBullet("Risposte contestuali");
      addSpace(10);

      // PROMEMORIA
      addTitle("12. Sistema Promemoria");
      addBullet("Campanella notifiche nell'header");
      addBullet("Promemoria scadenze documenti");
      addBullet("Promemoria scadenze attestati corsi");
      addBullet("Notifiche scansioni QR");
      addBullet("Statistiche promemoria");
      addBullet("Mark as read/completed");
      addSpace(10);

      // NEW PAGE
      doc.addPage();
      y = 20;

      // NEW PAGE
      doc.addPage();
      y = 20;

      // DATABASE
      addTitle("13. Database (Supabase)");
      addText("Tabelle:");
      addBullet("profiles - Dati utente (nome, azienda)");
      addBullet("documents - Documenti caricati con scadenze");
      addBullet("document_extracted_data - Dati estratti con AI");
      addBullet("user_roles - Ruoli utente");
      addBullet("contact_requests - Richieste contatto");
      addBullet("form_drafts - Bozze form salvate");
      addBullet("qr_codes - QR code generati");
      addBullet("qr_scans - Scansioni QR con geolocalizzazione");
      addBullet("crm_contacts - Contatti CRM");
      addBullet("crm_interactions - Interazioni CRM");
      addBullet("reminders - Promemoria e notifiche");
      addBullet("courses - Catalogo corsi di formazione");
      addBullet("course_editions - Edizioni programmate dei corsi");
      addBullet("course_lessons - Lezioni per ogni edizione");
      addBullet("course_enrollments - Iscrizioni e certificati");
      addBullet("course_attendance - Presenze per lezione");
      addBullet("course_branding_settings - Branding aziendale per PDF");
      addBullet("message_templates - Template messaggi");
      addBullet("google_calendar_tokens - Token Google Calendar");
      addSpace(10);

      // EDGE FUNCTIONS
      addTitle("14. Edge Functions");
      addBullet("ai-chat - Chat intelligente con AI");
      addBullet("check-expiries - Controllo scadenze documenti e attestati");
      addBullet("check-upcoming-events - Eventi in arrivo");
      addBullet("crm-agent - Agente AI per CRM");
      addBullet("document-agent - Estrazione dati documenti");
      addBullet("generate-signed-url - URL firmati per download");
      addBullet("google-calendar-auth - Autenticazione Google");
      addBullet("google-calendar-callback - Callback OAuth");
      addBullet("google-calendar-sync - Sincronizzazione calendario");
      addBullet("record-qr-scan - Registrazione scansioni con geolocalizzazione IP");
      addBullet("send-contact-email - Invio email contatti");
      addBullet("send-certificate-email - Invio attestati via email");
      addBullet("send-qr-email - Invio email QR code");
      addBullet("notify-qr-download - Notifiche download QR");
      addSpace(10);

      // TECNOLOGIE
      addTitle("15. Stack Tecnologico");
      addBullet("Frontend: React 18 + TypeScript + Vite");
      addBullet("Styling: Tailwind CSS + shadcn/ui");
      addBullet("Backend: Supabase (Auth, DB, Storage, Edge Functions, Realtime)");
      addBullet("AI: Lovable AI integration");
      addBullet("Email: Resend API");
      addBullet("QR Code: qrcode.react");
      addBullet("Grafici: Recharts");
      addBullet("PDF: jsPDF + stampa browser");
      addBullet("Excel: xlsx (importazione massiva)");
      addBullet("Routing: React Router 6");
      addBullet("State: TanStack Query");
      addBullet("Date: date-fns");
      addBullet("Mobile: Capacitor (iOS/Android ready)");
      addBullet("Geolocalizzazione: ip-api.com");
      addSpace(10);

      // NEW PAGE
      doc.addPage();
      y = 20;

      // DESIGN SYSTEM
      addTitle("16. Design System");
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
      addTitle("17. Navigazione");
      addBullet("Header: Logo, campanella notifiche, menu dropdown, login");
      addBullet("Bottom Nav: Home, Nuovo Cliente, Documenti, Profilo");
      addBullet("FloatingChat: Chat assistente sempre disponibile");
      addSpace(10);

      // EXPORT
      addTitle("18. Funzionalita Export");
      addBullet("Export statistiche QR in CSV");
      addBullet("Export report QR completo in PDF");
      addBullet("Export cronologia QR in CSV");
      addBullet("Registro presenze corsi in PDF");
      addBullet("Attestati personalizzati in PDF");
      addBullet("Download documentazione app in PDF");

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
            Consulta la documentazione online oppure scaricala in formato PDF
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

        {/* Documentazione Online */}
        <div className="max-w-2xl mx-auto mt-8">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Consulta online</h2>
          </div>
          <Accordion type="multiple" className="space-y-2">
            <AccordionItem value="panoramica" className="border rounded-lg px-4">
              <AccordionTrigger>1. Panoramica</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2">
                <p>SicurAzienda è una piattaforma digitale per la gestione della sicurezza sul lavoro. Offre servizi di consulenza, gestione documentale, formazione, CRM e assistente AI.</p>
                <p><strong>Slogan:</strong> "L'azione di tanti per la sicurezza di tutti"</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="home" className="border rounded-lg px-4">
              <AccordionTrigger>2. Home Page</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-1">
                <ul className="list-disc pl-5 space-y-1">
                  <li>Hero Section con gradiente brand giallo-rosso</li>
                  <li>6 servizi principali: Nuovo Cliente, Già Cliente, Area Documenti, Dashboard Admin, CRM, Assistente AI</li>
                  <li>Contatti rapidi: email, telefono, orari, indirizzo</li>
                  <li>Chat flottante per assistenza rapida</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="clienti" className="border rounded-lg px-4">
              <AccordionTrigger>3. Gestione Clienti</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2">
                <p className="font-medium">Nuovo Cliente</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Form richiesta check-up gratuito</li>
                  <li>Selezione servizi: DVR, Medicina del Lavoro, Formazione, HACCP, Privacy</li>
                  <li>Validazione codice fiscale in tempo reale</li>
                  <li>Invio email automatico + salvataggio database</li>
                </ul>
                <p className="font-medium mt-2">Già Cliente</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Form semplificato per clienti esistenti</li>
                  <li>Richiesta assistenza e supporto</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="documenti" className="border rounded-lg px-4">
              <AccordionTrigger>4. Gestione Documenti</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-1">
                <ul className="list-disc pl-5 space-y-1">
                  <li>Upload e download documenti</li>
                  <li>Generazione QR Code per ogni documento</li>
                  <li>Filtro per categoria e data di scadenza</li>
                  <li>Estrazione dati automatica con AI</li>
                  <li>Sezione attestati di formazione</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="auth" className="border rounded-lg px-4">
              <AccordionTrigger>5. Autenticazione e Profilo</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-1">
                <ul className="list-disc pl-5 space-y-1">
                  <li>Login/Registrazione via modal</li>
                  <li>Sessione persistente con Supabase</li>
                  <li>Recupero password</li>
                  <li>Profilo con bozze salvate</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="admin" className="border rounded-lg px-4">
              <AccordionTrigger>6. Area Amministrativa</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-1">
                <ul className="list-disc pl-5 space-y-1">
                  <li>Dashboard con statistiche documenti, utenti e QR</li>
                  <li>Grafici andamento QR (ultimi 30 giorni)</li>
                  <li>Carica attestati per utente specifico</li>
                  <li>Gestione ruoli: admin, user, contabilità, area_tecnica, gestione_corsi, consulenti_tecnici, medicina</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="qr" className="border rounded-lg px-4">
              <AccordionTrigger>7. Sistema QR Code</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-1">
                <ul className="list-disc pl-5 space-y-1">
                  <li>Generazione QR, copia link e download PNG</li>
                  <li>Invio automatico via email (Resend)</li>
                  <li>Cronologia con filtri e export CSV</li>
                  <li>Statistiche avanzate: scansioni, dispositivi, geolocalizzazione</li>
                  <li>Notifiche real-time via Supabase Realtime</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="crm" className="border rounded-lg px-4">
              <AccordionTrigger>8. Sistema CRM</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-1">
                <ul className="list-disc pl-5 space-y-1">
                  <li>Gestione contatti con stati (lead, prospect, cliente, inattivo)</li>
                  <li>Tags, note e cronologia interazioni</li>
                  <li>Calendario settimanale con sincronizzazione Google Calendar</li>
                  <li>Analytics e report attività</li>
                  <li>Agente AI per suggerimenti follow-up</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="corsi" className="border rounded-lg px-4">
              <AccordionTrigger>9. Gestione Corsi</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2">
                <ul className="list-disc pl-5 space-y-1">
                  <li>Catalogo corsi con tipologia, durata e obbligatorietà</li>
                  <li>Edizioni con date, aula, sede e docente</li>
                  <li>Iscrizioni dipendenti e matrice presenze interattiva</li>
                  <li>Attestati con 3 template e branding personalizzato</li>
                  <li>Registro presenze PDF stampabile</li>
                  <li>Importazione massiva da Excel</li>
                  <li>Scadenzario con notifiche automatiche</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="ai" className="border rounded-lg px-4">
              <AccordionTrigger>10. Assistente AI e Promemoria</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-1">
                <ul className="list-disc pl-5 space-y-1">
                  <li>Chat intelligente per supporto</li>
                  <li>Analisi documenti ed estrazione dati automatica</li>
                  <li>Campanella notifiche con promemoria scadenze</li>
                  <li>Notifiche scansioni QR real-time</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="tech" className="border rounded-lg px-4">
              <AccordionTrigger>11. Stack Tecnologico</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-1">
                <ul className="list-disc pl-5 space-y-1">
                  <li>Frontend: React 18 + TypeScript + Vite</li>
                  <li>Styling: Tailwind CSS + shadcn/ui</li>
                  <li>Backend: Supabase (Auth, DB, Storage, Edge Functions, Realtime)</li>
                  <li>Email: Resend API</li>
                  <li>Mobile: Capacitor (iOS/Android)</li>
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </main>
      
      <BottomNav />
    </div>
  );
};

export default AppDocumentation;