export interface NoteTemplate {
  id: string;
  name: string;
  icon: string;
  description: string;
  title: string;
  content: string;
}

export const NOTE_TEMPLATES: NoteTemplate[] = [
  {
    id: "meeting",
    name: "Verbale Riunione",
    icon: "📋",
    description: "Template per verbali di riunioni con partecipanti, argomenti e decisioni",
    title: "Verbale Riunione - [Data]",
    content: `<h2>📋 Verbale Riunione</h2>
<p><strong>Data:</strong> [Inserire data]</p>
<p><strong>Ora:</strong> [Inserire ora inizio - ora fine]</p>
<p><strong>Luogo:</strong> [Inserire luogo/link videoconferenza]</p>
<p><strong>Presenti:</strong></p>
<ul>
  <li>[Nome e ruolo]</li>
  <li>[Nome e ruolo]</li>
</ul>
<p><strong>Assenti:</strong></p>
<ul>
  <li>[Nome]</li>
</ul>
<hr>
<h3>Ordine del Giorno</h3>
<ol>
  <li>[Argomento 1]</li>
  <li>[Argomento 2]</li>
  <li>[Varie ed eventuali]</li>
</ol>
<hr>
<h3>Discussione</h3>
<h4>1. [Argomento 1]</h4>
<p>[Sintesi della discussione]</p>
<h4>2. [Argomento 2]</h4>
<p>[Sintesi della discussione]</p>
<hr>
<h3>Decisioni Prese</h3>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"></label><div>[Decisione 1 - Responsabile - Scadenza]</div></li>
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"></label><div>[Decisione 2 - Responsabile - Scadenza]</div></li>
</ul>
<hr>
<h3>Prossima Riunione</h3>
<p><strong>Data:</strong> [Inserire data]</p>
<p><strong>Argomenti:</strong> [Argomenti previsti]</p>`,
  },
  {
    id: "todo",
    name: "Lista Attività",
    icon: "✅",
    description: "Lista di attività con priorità e checklist",
    title: "Lista Attività - [Progetto]",
    content: `<h2>✅ Lista Attività</h2>
<p><strong>Progetto:</strong> [Nome progetto]</p>
<p><strong>Scadenza:</strong> [Data scadenza]</p>
<hr>
<h3>🔴 Priorità Alta</h3>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"></label><div>[Attività urgente 1]</div></li>
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"></label><div>[Attività urgente 2]</div></li>
</ul>
<h3>🟡 Priorità Media</h3>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"></label><div>[Attività media 1]</div></li>
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"></label><div>[Attività media 2]</div></li>
</ul>
<h3>🟢 Priorità Bassa</h3>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"></label><div>[Attività bassa 1]</div></li>
</ul>
<hr>
<h3>📝 Note</h3>
<p>[Aggiungi note o osservazioni]</p>`,
  },
  {
    id: "project",
    name: "Pianificazione Progetto",
    icon: "📐",
    description: "Template per pianificazione progetti con obiettivi, timeline e risorse",
    title: "Piano Progetto - [Nome]",
    content: `<h2>📐 Pianificazione Progetto</h2>
<p><strong>Nome Progetto:</strong> [Inserire nome]</p>
<p><strong>Responsabile:</strong> [Nome responsabile]</p>
<p><strong>Data inizio:</strong> [Data] | <strong>Data fine:</strong> [Data]</p>
<p><strong>Budget:</strong> [Importo]</p>
<hr>
<h3>🎯 Obiettivi</h3>
<ol>
  <li>[Obiettivo principale]</li>
  <li>[Obiettivo secondario]</li>
  <li>[Obiettivo terziario]</li>
</ol>
<hr>
<h3>📅 Timeline / Milestones</h3>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"></label><div><strong>Fase 1</strong> - [Descrizione] - Scadenza: [Data]</div></li>
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"></label><div><strong>Fase 2</strong> - [Descrizione] - Scadenza: [Data]</div></li>
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"></label><div><strong>Fase 3</strong> - [Descrizione] - Scadenza: [Data]</div></li>
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"></label><div><strong>Consegna finale</strong> - Scadenza: [Data]</div></li>
</ul>
<hr>
<h3>👥 Team / Risorse</h3>
<ul>
  <li><strong>[Ruolo]</strong>: [Nome] - [Responsabilità]</li>
  <li><strong>[Ruolo]</strong>: [Nome] - [Responsabilità]</li>
</ul>
<hr>
<h3>⚠️ Rischi e Mitigazioni</h3>
<ul>
  <li><strong>Rischio:</strong> [Descrizione] → <strong>Mitigazione:</strong> [Azione]</li>
</ul>
<hr>
<h3>📝 Note</h3>
<p>[Osservazioni aggiuntive]</p>`,
  },
  {
    id: "meeting_notes",
    name: "Note Meeting",
    icon: "🤝",
    description: "Appunti rapidi per meeting con punti chiave e azioni",
    title: "Meeting - [Argomento] - [Data]",
    content: `<h2>🤝 Note Meeting</h2>
<p><strong>Argomento:</strong> [Inserire argomento]</p>
<p><strong>Data:</strong> [Data e ora]</p>
<p><strong>Con:</strong> [Partecipanti]</p>
<hr>
<h3>📌 Punti Chiave</h3>
<ul>
  <li>[Punto discusso 1]</li>
  <li>[Punto discusso 2]</li>
  <li>[Punto discusso 3]</li>
</ul>
<hr>
<h3>✅ Azioni da Intraprendere</h3>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"></label><div>[Azione 1] → Responsabile: [Nome] - Entro: [Data]</div></li>
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"></label><div>[Azione 2] → Responsabile: [Nome] - Entro: [Data]</div></li>
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"></label><div>[Azione 3] → Responsabile: [Nome] - Entro: [Data]</div></li>
</ul>
<hr>
<h3>💡 Idee e Proposte</h3>
<p>[Annotare idee emerse durante il meeting]</p>
<hr>
<h3>📅 Prossimi Passi</h3>
<p>[Follow-up previsto, prossimo meeting]</p>`,
  },
  {
    id: "audit_sicurezza",
    name: "Scheda Audit Sicurezza",
    icon: "🛡️",
    description: "Scheda di rilevazione per audit di sicurezza sul lavoro con checklist e non conformità",
    title: "Audit Sicurezza - [Azienda] - [Data]",
    content: `<h2>🛡️ SCHEDA RILEVAZIONE AUDIT SICUREZZA</h2>
<hr>
<h3>📋 Dati Generali</h3>
<table>
  <tbody>
    <tr><td><strong>Data Audit:</strong></td><td>[Inserire data]</td></tr>
    <tr><td><strong>Azienda:</strong></td><td>[Ragione sociale]</td></tr>
    <tr><td><strong>Sede / Unità Locale:</strong></td><td>[Indirizzo sede]</td></tr>
    <tr><td><strong>RSPP:</strong></td><td>[Nome RSPP]</td></tr>
    <tr><td><strong>Medico Competente:</strong></td><td>[Nome MC]</td></tr>
    <tr><td><strong>RLS:</strong></td><td>[Nome RLS]</td></tr>
    <tr><td><strong>Auditor:</strong></td><td>[Nome auditor]</td></tr>
    <tr><td><strong>Tipo Audit:</strong></td><td>[Interno / Esterno / Sorveglianza]</td></tr>
  </tbody>
</table>
<hr>
<h3>📑 Documentazione Verificata</h3>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"></label><div>DVR (Documento Valutazione Rischi) aggiornato</div></li>
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"></label><div>DUVRI (se applicabile)</div></li>
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"></label><div>Piano di Emergenza ed Evacuazione</div></li>
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"></label><div>Registro infortuni</div></li>
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"></label><div>Verbali riunioni periodiche</div></li>
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"></label><div>Nomine (RSPP, MC, Addetti emergenze, Preposti)</div></li>
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"></label><div>Attestati formazione lavoratori</div></li>
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"></label><div>Protocollo sanitario e idoneità sanitarie</div></li>
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"></label><div>Libretti/certificazioni impianti e attrezzature</div></li>
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"></label><div>Schede dati sicurezza (SDS) sostanze chimiche</div></li>
</ul>
<hr>
<h3>🔍 Aree di Verifica</h3>
<h4>1. Ambienti di Lavoro</h4>
<table>
  <thead>
    <tr><th>Elemento</th><th>Conforme</th><th>Non Conforme</th><th>Note</th></tr>
  </thead>
  <tbody>
    <tr><td>Vie di fuga e uscite di emergenza</td><td>☐</td><td>☐</td><td></td></tr>
    <tr><td>Illuminazione adeguata</td><td>☐</td><td>☐</td><td></td></tr>
    <tr><td>Pavimentazione e ordine</td><td>☐</td><td>☐</td><td></td></tr>
    <tr><td>Segnaletica di sicurezza</td><td>☐</td><td>☐</td><td></td></tr>
    <tr><td>Aerazione e microclima</td><td>☐</td><td>☐</td><td></td></tr>
    <tr><td>Servizi igienici</td><td>☐</td><td>☐</td><td></td></tr>
  </tbody>
</table>
<h4>2. Attrezzature e Macchine</h4>
<table>
  <thead>
    <tr><th>Elemento</th><th>Conforme</th><th>Non Conforme</th><th>Note</th></tr>
  </thead>
  <tbody>
    <tr><td>Marcatura CE e conformità</td><td>☐</td><td>☐</td><td></td></tr>
    <tr><td>Dispositivi di protezione</td><td>☐</td><td>☐</td><td></td></tr>
    <tr><td>Manutenzione programmata</td><td>☐</td><td>☐</td><td></td></tr>
    <tr><td>Libretto d'uso e istruzioni</td><td>☐</td><td>☐</td><td></td></tr>
  </tbody>
</table>
<h4>3. DPI (Dispositivi Protezione Individuale)</h4>
<table>
  <thead>
    <tr><th>Elemento</th><th>Conforme</th><th>Non Conforme</th><th>Note</th></tr>
  </thead>
  <tbody>
    <tr><td>DPI disponibili e adeguati</td><td>☐</td><td>☐</td><td></td></tr>
    <tr><td>Stato di conservazione</td><td>☐</td><td>☐</td><td></td></tr>
    <tr><td>Utilizzo corretto da parte dei lavoratori</td><td>☐</td><td>☐</td><td></td></tr>
    <tr><td>Registro consegna DPI</td><td>☐</td><td>☐</td><td></td></tr>
  </tbody>
</table>
<h4>4. Antincendio ed Emergenze</h4>
<table>
  <thead>
    <tr><th>Elemento</th><th>Conforme</th><th>Non Conforme</th><th>Note</th></tr>
  </thead>
  <tbody>
    <tr><td>Estintori (presenza, revisione, accessibilità)</td><td>☐</td><td>☐</td><td></td></tr>
    <tr><td>Idranti (se presenti)</td><td>☐</td><td>☐</td><td></td></tr>
    <tr><td>Rivelatori fumo/incendio</td><td>☐</td><td>☐</td><td></td></tr>
    <tr><td>Illuminazione di emergenza</td><td>☐</td><td>☐</td><td></td></tr>
    <tr><td>Cassetta pronto soccorso</td><td>☐</td><td>☐</td><td></td></tr>
    <tr><td>Prove evacuazione effettuate</td><td>☐</td><td>☐</td><td></td></tr>
  </tbody>
</table>
<hr>
<h3>⚠️ Non Conformità Rilevate</h3>
<table>
  <thead>
    <tr><th>N.</th><th>Descrizione NC</th><th>Gravità</th><th>Azione Correttiva</th><th>Responsabile</th><th>Scadenza</th></tr>
  </thead>
  <tbody>
    <tr><td>1</td><td>[Descrizione]</td><td>[Alta/Media/Bassa]</td><td>[Azione prevista]</td><td>[Nome]</td><td>[Data]</td></tr>
    <tr><td>2</td><td>[Descrizione]</td><td>[Alta/Media/Bassa]</td><td>[Azione prevista]</td><td>[Nome]</td><td>[Data]</td></tr>
    <tr><td>3</td><td>[Descrizione]</td><td>[Alta/Media/Bassa]</td><td>[Azione prevista]</td><td>[Nome]</td><td>[Data]</td></tr>
  </tbody>
</table>
<hr>
<h3>✅ Azioni Correttive da Intraprendere</h3>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"></label><div>[Azione 1] - Responsabile: [Nome] - Scadenza: [Data]</div></li>
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"></label><div>[Azione 2] - Responsabile: [Nome] - Scadenza: [Data]</div></li>
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"></label><div>[Azione 3] - Responsabile: [Nome] - Scadenza: [Data]</div></li>
</ul>
<hr>
<h3>📝 Osservazioni e Raccomandazioni</h3>
<p>[Inserire osservazioni generali emerse durante l'audit]</p>
<hr>
<h3>✍️ Firme</h3>
<table>
  <tbody>
    <tr><td><strong>Auditor:</strong></td><td>____________________</td><td><strong>Data:</strong></td><td>[Data]</td></tr>
    <tr><td><strong>RSPP:</strong></td><td>____________________</td><td><strong>Data:</strong></td><td>[Data]</td></tr>
    <tr><td><strong>Datore di Lavoro:</strong></td><td>____________________</td><td><strong>Data:</strong></td><td>[Data]</td></tr>
  </tbody>
</table>
<hr>
<p><em>Prossimo audit previsto: [Data]</em></p>`,
  },
];
