import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, ClipboardList, NotebookPen, FileSpreadsheet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Course, CourseEdition, CourseEnrollment, CourseLesson } from "@/hooks/useCourses";
import { BrandingSettings, useCourseBranding } from "./CourseBrandingSettings";

interface Props {
  course: Course;
  edition: CourseEdition;
  enrollments: CourseEnrollment[];
  lessons: CourseLesson[];
}

function fmt(d?: string | null) {
  return d ? new Date(d).toLocaleDateString("it-IT") : "________________";
}

function brandHeader(branding: BrandingSettings | null, logoUrl: string | null) {
  const logo = logoUrl
    ? `<img src="${logoUrl}" style="height:48px;max-width:160px;object-fit:contain" />`
    : `<div style="font-weight:700;color:#1e3a8a;font-size:14px">${branding?.company_name || "SicurAzienda"}</div>`;
  const accred = `ENTE ACCREDITATO PER LA FORMAZIONE DALLA REGIONE PIEMONTE N.1399/001 — Codice abilitazione corsi RSPP, DLSPP, Attrezzature, Lavori in quota: A421/2015 — Società certificata UNI EN ISO 9001:2015`;
  return { logo, accred };
}

function baseCss() {
  return `
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #111827; margin: 0; }
  .page { page-break-after: always; }
  .page:last-child { page-break-after: auto; }
  .doc-head { display:flex; justify-content:space-between; align-items:flex-start; border-bottom: 2px solid #1e3a8a; padding-bottom:8px; margin-bottom:12px; gap:12px; }
  .doc-head .left { display:flex; gap:10px; align-items:center; }
  .doc-head .meta { font-size:9px; color:#374151; text-align:right; line-height:1.4; }
  .doc-title { font-size: 16px; font-weight:700; color:#1e3a8a; letter-spacing:.5px; text-align:center; margin: 6px 0 12px; text-transform:uppercase; }
  .accred { font-size: 8px; color:#6b7280; margin-top:2px; max-width: 520px; }
  table.data { width:100%; border-collapse:collapse; margin: 6px 0; }
  table.data td, table.data th { border:1px solid #d1d5db; padding:5px 7px; font-size:11px; vertical-align: top; }
  table.data th { background:#eef2ff; color:#1e3a8a; text-align:left; }
  .row-label { background:#f3f4f6; font-weight:600; width:38%; }
  ul.tight { margin: 4px 0 8px 18px; padding:0; }
  ul.tight li { margin-bottom:3px; line-height:1.35; }
  .sig { margin-top: 24px; display:flex; justify-content:space-between; gap:30px; }
  .sig div { flex:1; border-top:1px solid #374151; padding-top:4px; text-align:center; font-size:10px; color:#6b7280; }
  .footer { position: fixed; bottom: 6mm; left: 14mm; right:14mm; font-size:8px; color:#9ca3af; display:flex; justify-content:space-between; border-top:1px solid #e5e7eb; padding-top:3px; }
  h2.sec { font-size:12px; color:#1e3a8a; margin: 10px 0 4px; }
  .check-cell { text-align:center; width:36px; }
  .qbox { display:inline-block; width:11px; height:11px; border:1px solid #374151; margin-right:4px; vertical-align:middle; }
  `;
}

function printHTML(html: string) {
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.onload = () => win.print();
}

function studentName(enr: CourseEnrollment) {
  return enr.employee ? `${enr.employee.last_name} ${enr.employee.first_name}` : "____________________________";
}
function studentCompany(enr: CourseEnrollment) {
  return enr.contact?.company || enr.contact?.name || "____________________________";
}

function schedaAllievoPage(course: Course, edition: CourseEdition, enr: CourseEnrollment, brand: ReturnType<typeof brandHeader>) {
  return `<section class="page">
  <div class="doc-head">
    <div class="left">${brand.logo}<div><div style="font-size:13px;font-weight:700">SCHEDA ALLIEVO</div><div class="accred">${brand.accred}</div></div></div>
    <div class="meta">M 09 32<br/>Ed. 01 — Rev. 02<br/>Data 28/11/2023</div>
  </div>
  <h2 class="sec">Dati anagrafici</h2>
  <table class="data">
    <tr><td class="row-label">Azienda</td><td>${studentCompany(enr)}</td></tr>
    <tr><td class="row-label">Cognome e Nome</td><td>${studentName(enr)}</td></tr>
    <tr><td class="row-label">Luogo — Data di nascita</td><td>____________________________ — ____________</td></tr>
    <tr><td class="row-label">Codice fiscale</td><td>${enr.employee?.fiscal_code || "________________"}</td></tr>
    <tr><td class="row-label">Tipologia Corso</td><td>${course.name}</td></tr>
    <tr><td class="row-label">Edizione Corso</td><td>${edition.edition_code || ""}</td></tr>
  </table>
  <h2 class="sec">Check list allegati</h2>
  <table class="data">
    ${[
      "Modulo di iscrizione [N.B. Solo per privati]",
      "Contratto formativo allievo [Mod. 09 17]",
      "Calendario corso di formazione [Mod. 04 11]",
      "Questionario gradimento fine corso [Mod. 09 22]",
      "Test di apprendimento",
      "Eventuale documentazione integrativa al test",
      "Ricezione attestato",
    ].map(l => `<tr><td>${l}</td><td class="check-cell">Sì <span class="qbox"></span></td><td class="check-cell">No <span class="qbox"></span></td></tr>`).join("")}
  </table>
  <div class="sig"><div>Firma allievo</div><div>Firma responsabile corso</div></div>
</section>`;
}

function contrattoFormativoPages(course: Course, edition: CourseEdition, enr: CourseEnrollment, brand: ReturnType<typeof brandHeader>) {
  const head = (pag: string) => `<div class="doc-head">
    <div class="left">${brand.logo}<div><div style="font-size:13px;font-weight:700">CONTRATTO FORMATIVO</div><div class="accred">${brand.accred}</div></div></div>
    <div class="meta">M 09 17 — ${pag}<br/>Ed. 01 — Rev. 02<br/>Data 28/11/2023</div>
  </div>`;
  return `<section class="page">
    ${head("Pag. 1 di 3")}
    <p><strong>Tipologia Corso:</strong> ${course.name}<br/>
    <strong>Normativa Rif.:</strong> D. Lgs. 81/08 e s.m.i. art. 37 e Accordo Stato-Regioni del 21/12/2011</p>
    <p style="text-align:center"><strong>TRA</strong></p>
    <p>SicurAzienda S.r.l. con sede legale e operativa in Via Giacomo Leopardi, n. 13 — Grugliasco (TO), Partita IVA 11131470012, rappresentata dal suo amministratore Busciolà Roberto</p>
    <p style="text-align:center"><strong>E</strong></p>
    <table class="data">
      <tr><td class="row-label">Azienda</td><td>${studentCompany(enr)}</td></tr>
      <tr><td class="row-label">Codice fiscale / P.IVA</td><td>____________________________</td></tr>
      <tr><td class="row-label">Allievo</td><td>${studentName(enr)}</td></tr>
      <tr><td class="row-label">Tipologia Corso</td><td>${course.name}</td></tr>
      <tr><td class="row-label">Edizione Corso</td><td>${edition.edition_code || ""}</td></tr>
    </table>
    <p style="font-size:10px">L'Ente organizzatore in qualità di Ente accreditato per la formazione dalla Regione Piemonte n. 1399/001, codice abilitazione A421/2015 e società certificata UNI EN ISO 9001:2015, si impegna a:</p>
    <ul class="tight">
      <li>identificare tutto il personale docente e non docente e presentarlo agli allievi;</li>
      <li>regolare i rapporti tra tutte le parti coinvolte nel processo formativo;</li>
      <li>identificare un proprio collaboratore come Tutor / Sostituto Responsabile Corso;</li>
      <li>fornire all'allievo quanto necessario allo svolgimento del corso (attrezzature didattiche, docenza);</li>
      <li>sostenere gli utenti nel raggiungimento degli obiettivi formativi;</li>
      <li>rendere disponibile l'attestato al corsista entro 15 giorni dalla fine corso o dall'ultimo giorno di recupero;</li>
      <li>verificare l'osservanza delle condizioni che costituiscono il presente Contratto Formativo.</li>
    </ul>
  </section>
  <section class="page">
    ${head("Pag. 2 di 3")}
    <p style="font-size:10px">Il centro offre la mediazione di figure professionali che intervengono in base alle specifiche esigenze del percorso:</p>
    <ul class="tight">
      <li>Responsabile Progetto formativo: Di Matteo Angiolina Maria — gestionecorsi@sicurazienda.com;</li>
      <li>Responsabile Sede: Sig.ra Silva Simona — tel. 011/19503922 — simona.s@sicurazienda.com;</li>
      <li>Responsabile Corso e Segreteria Didattica: Guidi Sara — tel. 011/18866750 — gestionecorsi@sicurazienda.com;</li>
      <li>Formatori che svolgono il servizio di segreteria didattica durante l'attività formativa.</li>
    </ul>
    <h2 class="sec">L'azienda si impegna a</h2>
    <ul class="tight">
      <li>restituire il Contratto Formativo firmato entro la terza lezione del corso o entro fine corso per durate inferiori/uguali alla singola giornata;</li>
      <li>garantire che la formazione avvenga durante l'orario di lavoro senza oneri economici a carico dei lavoratori;</li>
      <li>fornire una copia dell'attestato ricevuto al discente/lavoratore;</li>
      <li>stimolare l'allievo alla frequenza e segnalare assenze al tel. 011/19503922.</li>
    </ul>
    <h2 class="sec">L'allievo si impegna a</h2>
    <ul class="tight">
      <li>apporre la propria firma leggibile e per esteso sul registro entro 10 minuti dall'ingresso in aula;</li>
      <li>garantire la presenza necessaria al completamento del ciclo formativo (assenze max 10% per i corsi in materia di sicurezza);</li>
      <li>rispettare gli orari del corso, non fumare nell'edificio né davanti al portone d'ingresso;</li>
      <li>mantenere un atteggiamento professionale e responsabile, spegnere il cellulare durante le lezioni;</li>
      <li>utilizzare correttamente strutture, laboratori e materiale didattico;</li>
      <li>accogliere attivamente la proposta formativa contribuendo personalmente.</li>
    </ul>
  </section>
  <section class="page">
    ${head("Pag. 3 di 3")}
    <p>Letto, approvato e sottoscritto il _____________</p>
    <div style="margin-top:30px">
      <p><strong>Per SicurAzienda S.r.l.</strong></p>
      <p style="margin-top:40px">_____________________________________________</p>
    </div>
    <div style="margin-top:30px">
      <p><strong>Per l'Azienda</strong> — ${studentCompany(enr)}</p>
      <p style="margin-top:40px">_____________________________________________</p>
    </div>
    <div style="margin-top:30px">
      <p><strong>L'allievo</strong> — ${studentName(enr)}</p>
      <p style="margin-top:40px">_____________________________________________</p>
    </div>
  </section>`;
}

function calendarioPage(course: Course, edition: CourseEdition, lessons: CourseLesson[], brand: ReturnType<typeof brandHeader>) {
  const rows = (lessons.length ? lessons : [{ id: "x", lesson_date: "", start_time: "", end_time: "", topic: "" } as any]).map((l, i) => `
    <tr>
      <td style="text-align:center">${i + 1}</td>
      <td>${l.lesson_date ? fmt(l.lesson_date) : ""}</td>
      <td>${l.start_time ? l.start_time.slice(0,5) : ""}${l.end_time ? " — " + l.end_time.slice(0,5) : ""}</td>
      <td>${l.topic || ""}</td>
      <td>${(l as any).instructor_name || edition.instructor_name || ""}</td>
      <td>${edition.location || ""}</td>
    </tr>`).join("");
  return `<section class="page">
    <div class="doc-head">
      <div class="left">${brand.logo}<div><div style="font-size:13px;font-weight:700">CALENDARIO CORSO DI FORMAZIONE</div><div class="accred">${brand.accred}</div></div></div>
      <div class="meta">M 04 11<br/>Ed. 01 — Rev. 02<br/>Data 28/11/2023</div>
    </div>
    <h2 class="sec">Tipologia corso</h2>
    <p>${course.name} — Edizione <strong>${edition.edition_code || ""}</strong></p>
    <table class="data">
      <tr><td class="row-label">Sede di svolgimento</td><td>${edition.location || ""}</td></tr>
      <tr><td class="row-label">Docente</td><td>${edition.instructor_name || ""}</td></tr>
      <tr><td class="row-label">Durata complessiva</td><td>${course.duration_hours ? course.duration_hours + " ore" : ""}</td></tr>
    </table>
    <table class="data">
      <thead><tr><th>#</th><th>Data</th><th>Orario</th><th>Argomento / Modulo</th><th>Docente</th><th>Sede</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="font-size:9px;color:#6b7280;margin-top:10px">La Segreteria didattica si riserva di comunicare eventuali variazioni entro 5 giorni feriali precedenti la data di inizio corso. Per comunicare l'impossibilità a partecipare contattare 011/19503922 o segreteria@sicurazienda.com.</p>
  </section>`;
}

const FEEDBACK_ITEMS = [
  "Adeguatezza dei contenuti rispetto agli obiettivi del corso",
  "Chiarezza dell'esposizione dei docenti",
  "Materiale didattico distribuito",
  "Durata complessiva del corso",
  "Adeguatezza dell'aula e delle attrezzature",
  "Organizzazione e segreteria didattica",
  "Gestione dell'aula: capacità comunicative e relazionali",
  "Valutazione complessiva del corso",
];
function questionarioPages(course: Course, edition: CourseEdition, enr: CourseEnrollment, brand: ReturnType<typeof brandHeader>) {
  const head = (pag: string) => `<div class="doc-head">
    <div class="left">${brand.logo}<div><div style="font-size:13px;font-weight:700">QUESTIONARIO GRADIMENTO CORSO</div><div class="accred">${brand.accred}</div></div></div>
    <div class="meta">M 09 22 — ${pag}<br/>Ed. 02 — Rev. 02<br/>Data 28/11/2023</div>
  </div>`;
  return `<section class="page">
    ${head("Pag. 1 di 2")}
    <table class="data">
      <tr><td class="row-label">Corso</td><td>${course.name}</td></tr>
      <tr><td class="row-label">Edizione</td><td>${edition.edition_code || ""}</td></tr>
      <tr><td class="row-label">Allievo</td><td>${studentName(enr)}</td></tr>
      <tr><td class="row-label">Azienda</td><td>${studentCompany(enr)}</td></tr>
    </table>
    <p style="font-size:10px">Esprima il suo grado di soddisfazione (1 = insufficiente, 5 = ottimo)</p>
    <table class="data">
      <thead><tr><th>Voce</th><th>1</th><th>2</th><th>3</th><th>4</th><th>5</th></tr></thead>
      <tbody>${FEEDBACK_ITEMS.map(it => `<tr><td>${it}</td><td class="check-cell"><span class="qbox"></span></td><td class="check-cell"><span class="qbox"></span></td><td class="check-cell"><span class="qbox"></span></td><td class="check-cell"><span class="qbox"></span></td><td class="check-cell"><span class="qbox"></span></td></tr>`).join("")}</tbody>
    </table>
  </section>
  <section class="page">
    ${head("Pag. 2 di 2")}
    <h2 class="sec">Suggerimenti e commenti</h2>
    <div style="border:1px solid #d1d5db;height:120px;padding:6px"></div>
    <table class="data" style="margin-top:14px">
      <tr><td class="row-label">Data</td><td>${fmt(edition.end_date || edition.start_date)}</td></tr>
      <tr><td class="row-label">Firma (facoltativa)</td><td style="height:36px"></td></tr>
    </table>
  </section>`;
}

const TEST_QUESTIONS = [
  { q: "Il D.Lgs. 81/08 si applica a tutti i settori di attività pubblici e privati", a: "V" },
  { q: "Il lavoratore è colui che, indipendentemente dalla tipologia contrattuale, svolge un'attività lavorativa nell'organizzazione di un datore di lavoro pubblico o privato, con o senza retribuzione", a: "V" },
  { q: "Il «datore di lavoro» è il soggetto titolare del rapporto di lavoro con il lavoratore o, comunque, il soggetto che ha la responsabilità dell'organizzazione e ne esercita i poteri decisionali e di spesa", a: "V" },
  { q: "Il lavoratore di sua iniziativa deve comprare i Dispositivi di Protezione Individuali (DPI) necessari per la sua mansione", a: "F" },
  { q: "Il Datore di Lavoro deve adempiere agli obblighi di formazione, informazione ed addestramento dei lavoratori", a: "V" },
  { q: "La comunicazione del nominativo del RLS all'INAIL deve essere effettuata ogni qualvolta vi sia un cambiamento del nominativo", a: "V" },
  { q: "L'obbligo di designazione del RSPP è delegabile dal datore di lavoro", a: "F" },
  { q: "Il «preposto di fatto» è quel soggetto che, pur non avendo un ruolo gerarchico, sia solito impartire ordini non venendo sconfessato dai superiori gerarchici", a: "V" },
  { q: "La visita medica preventiva in fase preassuntiva è vietata", a: "F" },
  { q: "Rischio di un evento incidentale è il prodotto di due fattori: la probabilità e il danno", a: "V" },
];
function testPages(course: Course, edition: CourseEdition, enr: CourseEnrollment | null, brand: ReturnType<typeof brandHeader>, includeCorrector = false) {
  const head = `<div class="doc-head">
    <div class="left">${brand.logo}<div><div style="font-size:13px;font-weight:700">TEST DI VERIFICA APPRENDIMENTO — ${course.name.toUpperCase()}</div><div class="accred">${brand.accred}</div></div></div>
    <div class="meta">Modulo Generale<br/>Sito: www.sicurazienda.com<br/>Tel: 011 19503922</div>
  </div>`;
  const rows = TEST_QUESTIONS.map((t, i) => `<tr>
    <td style="width:24px;text-align:center">${i+1}</td>
    <td>${t.q}</td>
    <td class="check-cell"><span class="qbox"></span> V</td>
    <td class="check-cell"><span class="qbox"></span> F</td>
    <td class="check-cell"><span class="qbox"></span> NS</td>
  </tr>`).join("");
  let html = `<section class="page">${head}
    <table class="data">
      <tr><td class="row-label">Cognome e Nome</td><td>${enr ? studentName(enr) : "____________________________"}</td><td class="row-label" style="width:18%">Data</td><td>${fmt(edition.start_date)}</td></tr>
      <tr><td class="row-label">Azienda</td><td colspan="3">${enr ? studentCompany(enr) : "____________________________"}</td></tr>
    </table>
    <h2 class="sec">Crocetta la risposta esatta</h2>
    <table class="data"><tbody>${rows}</tbody></table>
    <p style="margin-top:10px">Risposte esatte: ______ / 10</p>
    <p style="font-size:10px">L'allievo dichiara di aver compreso il significato delle parole e delle domande alle quali ha risposto.</p>
    <div class="sig"><div>Firma dell'allievo</div><div>Firma del docente</div></div>
  </section>`;
  if (includeCorrector) {
    html += `<section class="page">${head}
      <h2 class="sec">Correttore — Modulo Generale</h2>
      <table class="data" style="max-width:280px"><thead><tr><th>Domanda</th><th>Risposta</th></tr></thead>
        <tbody>${TEST_QUESTIONS.map((t,i)=>`<tr><td style="text-align:center">${i+1}</td><td style="text-align:center;font-weight:700">${t.a}</td></tr>`).join("")}</tbody>
      </table>
    </section>`;
  }
  return html;
}

function registroPresenzePages(course: Course, edition: CourseEdition, enrollments: CourseEnrollment[], lessons: CourseLesson[], brand: ReturnType<typeof brandHeader>) {
  const head = `<div class="doc-head">
    <div class="left">${brand.logo}<div><div style="font-size:13px;font-weight:700">REGISTRO PRESENZE GIORNALIERE ALLIEVI</div><div class="accred">${brand.accred}</div></div></div>
    <div class="meta">Codice operatore: D80606<br/>Anno formativo: ${new Date(edition.start_date || Date.now()).getFullYear()}</div>
  </div>`;
  const rows = Math.max(enrollments.length, 15);
  const anagraficaRows = Array.from({ length: rows }).map((_, i) => {
    const e = enrollments[i];
    return `<tr>
      <td style="text-align:center">${i+1}</td>
      <td>${e ? studentCompany(e) : ""}</td>
      <td>${e ? studentName(e) : ""}</td>
      <td></td><td></td><td></td>
    </tr>`;
  }).join("");
  const cover = `<section class="page">${head}
    <div class="doc-title">Anno formativo ${new Date(edition.start_date || Date.now()).getFullYear()}</div>
    <table class="data">
      <tr><td class="row-label">Codice corso</td><td>${edition.edition_code || ""}</td></tr>
      <tr><td class="row-label">Denominazione corso</td><td>${course.name}</td></tr>
      <tr><td class="row-label">Sede di svolgimento</td><td>${edition.location || ""}</td></tr>
      <tr><td class="row-label">Docente</td><td>${edition.instructor_name || ""}</td></tr>
      <tr><td class="row-label">Periodo</td><td>${fmt(edition.start_date)}${edition.end_date && edition.end_date !== edition.start_date ? " — " + fmt(edition.end_date) : ""}</td></tr>
    </table>
    <h2 class="sec">Istruzioni per l'uso del registro</h2>
    <ol style="font-size:10px;line-height:1.45;margin-left:18px">
      <li>Tutte le lezioni devono essere registrate progressivamente (non si possono aggiungere lezioni con date antecedenti).</li>
      <li>La facciata di copertina deve essere compilata in ogni sua parte prima dell'inizio dell'attività formativa.</li>
      <li>Gli allievi appongono la firma all'entrata in aula, leggibile e per esteso.</li>
      <li>L'assenza dell'allievo va evidenziata con la dicitura "ASSENTE"; per allievi ritirati indicare "RITIRATO".</li>
      <li>Il docente indica orario effettivo di inizio e fine lezione e firma in modo leggibile.</li>
      <li>Scrivere esclusivamente con penna blu o nera; le correzioni devono essere vistate dal responsabile del corso.</li>
    </ol>
  </section>`;
  const docenti = `<section class="page">${head}
    <h2 class="sec">Elenco docenti / tutor</h2>
    <table class="data">
      <thead><tr><th style="width:30px">N°</th><th>Cognome / Nome</th><th style="width:30%">Firma</th></tr></thead>
      <tbody>
        <tr><td>1</td><td>${edition.instructor_name || ""}</td><td></td></tr>
        <tr><td>2</td><td></td><td></td></tr>
        <tr><td>3</td><td></td><td></td></tr>
      </tbody>
    </table>
    <table class="data" style="margin-top:14px">
      <tr><td class="row-label">Responsabile del corso</td><td></td><td class="row-label" style="width:25%">Recapito</td><td></td></tr>
      <tr><td class="row-label">Tutor d'aula</td><td></td><td class="row-label">Recapito</td><td></td></tr>
    </table>
  </section>`;
  const anagrafica = `<section class="page">${head}
    <h2 class="sec">Dati anagrafici allievi</h2>
    <table class="data">
      <thead><tr><th style="width:24px">ID</th><th>Azienda</th><th>Cognome e Nome</th><th>Comune di nascita</th><th>Data di nascita</th><th>Firma validazione dati</th></tr></thead>
      <tbody>${anagraficaRows}</tbody>
    </table>
  </section>`;
  const lessonPages = (lessons.length ? lessons : [{ id: "x", lesson_date: edition.start_date, start_time: "", end_time: "", topic: "Lezione 1", instructor_name: edition.instructor_name } as any]).map(l => {
    const lessonRows = Array.from({ length: rows }).map((_, i) => {
      const e = enrollments[i];
      return `<tr><td style="text-align:center;width:24px">${i+1}</td><td>${e ? studentName(e) : ""}</td><td style="height:22px"></td></tr>`;
    }).join("");
    return `<section class="page">${head}
      <div class="doc-title">Presenze del giorno: ${fmt((l as any).lesson_date)}</div>
      <table class="data" style="margin-bottom:6px">
        <tr><td class="row-label" style="width:18%">Orario</td><td>${(l as any).start_time ? (l as any).start_time.slice(0,5) : "____"} — ${(l as any).end_time ? (l as any).end_time.slice(0,5) : "____"}</td><td class="row-label" style="width:18%">Docente</td><td>${(l as any).instructor_name || edition.instructor_name || ""}</td></tr>
        <tr><td class="row-label">Programma svolto</td><td colspan="3">${(l as any).topic || ""}</td></tr>
      </table>
      <table class="data">
        <thead><tr><th style="width:24px">ID</th><th style="width:35%">Cognome e Nome allievo</th><th>Firma allievo</th></tr></thead>
        <tbody>${lessonRows}</tbody>
      </table>
      <div class="sig"><div>Firma docente</div><div>Firma responsabile corso</div></div>
    </section>`;
  }).join("");
  return cover + docenti + anagrafica + lessonPages;
}

function wrapHtml(title: string, body: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title><style>${baseCss()}</style></head><body>${body}</body></html>`;
}

export default function EditionMasterDocs({ course, edition, enrollments, lessons }: Props) {
  const { toast } = useToast();
  const { branding, logoUrl } = useCourseBranding();
  const brand = brandHeader(branding, logoUrl);

  const needEnrollments = (cb: () => void) => {
    if (enrollments.length === 0) {
      toast({ title: "Nessun iscritto", description: "Aggiungi almeno un allievo prima di generare la documentazione.", variant: "destructive" });
      return;
    }
    cb();
  };

  const genDossier = () => needEnrollments(() => {
    const body = enrollments.map(enr => [
      schedaAllievoPage(course, edition, enr, brand),
      contrattoFormativoPages(course, edition, enr, brand),
      calendarioPage(course, edition, lessons, brand),
      questionarioPages(course, edition, enr, brand),
      testPages(course, edition, enr, brand, false),
    ].join("")).join("");
    printHTML(wrapHtml(`Dossier Allievi — ${edition.edition_code}`, body));
    toast({ title: "Dossier generato", description: `${enrollments.length} allievo/i` });
  });

  const genRegistro = () => {
    const body = registroPresenzePages(course, edition, enrollments, lessons, brand);
    printHTML(wrapHtml(`Registro Presenze — ${edition.edition_code}`, body));
    toast({ title: "Registro presenze generato" });
  };

  const genTest = () => {
    const body = testPages(course, edition, null, brand, true);
    printHTML(wrapHtml(`Test apprendimento — ${edition.edition_code}`, body));
    toast({ title: "Test apprendimento generato" });
  };

  const genCalendarioOnly = () => {
    const body = calendarioPage(course, edition, lessons, brand);
    printHTML(wrapHtml(`Calendario — ${edition.edition_code}`, body));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" /> Documentazione edizione</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p className="text-muted-foreground text-xs">
          Genera i master ufficiali precompilati con i dati dell'edizione <strong>{edition.edition_code}</strong>,
          docente <strong>{edition.instructor_name || "—"}</strong>, sede <strong>{edition.location || "—"}</strong>
          {" "}e {enrollments.length} allievo/i iscritti.
        </p>
        <div className="grid sm:grid-cols-2 gap-2 pt-1">
          <Button variant="outline" onClick={genDossier} className="justify-start gap-2">
            <NotebookPen className="h-4 w-4" /> Dossier Allievi (tutti)
          </Button>
          <Button variant="outline" onClick={genRegistro} className="justify-start gap-2">
            <ClipboardList className="h-4 w-4" /> Registro Presenze
          </Button>
          <Button variant="outline" onClick={genTest} className="justify-start gap-2">
            <FileSpreadsheet className="h-4 w-4" /> Test Apprendimento (+ correttore)
          </Button>
          <Button variant="outline" onClick={genCalendarioOnly} className="justify-start gap-2">
            <FileText className="h-4 w-4" /> Calendario Corso
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground pt-2">
          Il Dossier include per ogni allievo: Scheda Allievo (M 09 32), Contratto Formativo (M 09 17, 3 pagine),
          Calendario (M 04 11), Questionario Gradimento (M 09 22) e Test di apprendimento.
          I documenti si aprono in una nuova finestra di stampa: usa "Salva come PDF" dal dialogo di stampa.
        </p>
      </CardContent>
    </Card>
  );
}
