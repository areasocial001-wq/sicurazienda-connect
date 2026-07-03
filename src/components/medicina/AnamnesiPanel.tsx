import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { HeartPulse, Save, Loader2 } from 'lucide-react';
import { useHealthRecord, MedicalHealthRecord } from '@/hooks/useHealthRecord';
import { supabase } from '@/integrations/supabase/client';

interface Props { employeeId?: string; contactId?: string | null; }

export const AnamnesiPanel = ({ employeeId, contactId }: Props) => {
  const { record, loading, saving, save } = useHealthRecord(employeeId);
  const [form, setForm] = useState<Partial<MedicalHealthRecord>>({});
  const [risks, setRisks] = useState<{ risk_code: string; risk_name: string }[]>([]);

  useEffect(() => { setForm(record || {}); }, [record]);
  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any).from('medical_risk_catalog').select('risk_code,risk_name').order('risk_name');
      setRisks(data || []);
    })();
  }, []);

  const toggleRisk = (code: string) => {
    const cur = form.current_risks || [];
    setForm({ ...form, current_risks: cur.includes(code) ? cur.filter((r) => r !== code) : [...cur, code] });
  };

  if (!employeeId) return null;
  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  const field = (k: keyof MedicalHealthRecord) => (form[k] as any) ?? '';
  const set = (k: keyof MedicalHealthRecord, v: any) => setForm({ ...form, [k]: v });

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start gap-2 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2 text-base"><HeartPulse className="h-4 w-4 text-primary" />Cartella sanitaria — Anamnesi (D.Lgs 81/08 art. 25)</CardTitle>
            <CardDescription>Dati anagrafico-sanitari, anamnesi ed abitudini del lavoratore.</CardDescription>
          </div>
          <Button size="sm" onClick={() => save(form, contactId)} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}Salva cartella
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <section>
          <h4 className="font-semibold text-sm mb-2">Dati sanitari</h4>
          <div className="grid md:grid-cols-4 gap-3">
            <div><Label className="text-xs">Luogo nascita</Label><Input value={field('birth_place')} onChange={(e) => set('birth_place', e.target.value)} /></div>
            <div><Label className="text-xs">Data nascita</Label><Input type="date" value={field('birth_date')} onChange={(e) => set('birth_date', e.target.value || null)} /></div>
            <div><Label className="text-xs">Sesso</Label>
              <Select value={field('gender') || undefined} onValueChange={(v) => set('gender', v)}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Maschile</SelectItem><SelectItem value="F">Femminile</SelectItem><SelectItem value="X">Altro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Gruppo sanguigno</Label><Input value={field('blood_group')} onChange={(e) => set('blood_group', e.target.value)} /></div>
            <div><Label className="text-xs">Altezza (cm)</Label><Input type="number" value={field('height_cm')} onChange={(e) => set('height_cm', e.target.value ? +e.target.value : null)} /></div>
            <div><Label className="text-xs">Peso (kg)</Label><Input type="number" step="0.1" value={field('weight_kg')} onChange={(e) => set('weight_kg', e.target.value ? +e.target.value : null)} /></div>
            <div><Label className="text-xs">Mano dominante</Label>
              <Select value={field('dominant_hand') || undefined} onValueChange={(v) => set('dominant_hand', v)}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent><SelectItem value="dx">Destra</SelectItem><SelectItem value="sx">Sinistra</SelectItem><SelectItem value="amb">Ambidestro</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Ultima revisione</Label><Input type="date" value={field('last_review_date')} onChange={(e) => set('last_review_date', e.target.value || null)} /></div>
          </div>
        </section>

        <section>
          <h4 className="font-semibold text-sm mb-2">Mansione e rischi correnti</h4>
          <div className="grid md:grid-cols-2 gap-3">
            <div><Label className="text-xs">Mansione attuale</Label><Input value={field('current_job_role')} onChange={(e) => set('current_job_role', e.target.value)} /></div>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {risks.map((r) => {
              const active = (form.current_risks || []).includes(r.risk_code);
              return (
                <Badge key={r.risk_code} variant={active ? 'default' : 'outline'} className="cursor-pointer" onClick={() => toggleRisk(r.risk_code)}>
                  <Checkbox checked={active} className="mr-1 h-3 w-3" onCheckedChange={() => toggleRisk(r.risk_code)} />
                  {r.risk_name}
                </Badge>
              );
            })}
          </div>
        </section>

        <section className="grid md:grid-cols-2 gap-3">
          <div><Label className="text-xs">Anamnesi familiare</Label><Textarea rows={3} value={field('anamnesi_familiare')} onChange={(e) => set('anamnesi_familiare', e.target.value)} /></div>
          <div><Label className="text-xs">Anamnesi fisiologica</Label><Textarea rows={3} value={field('anamnesi_fisiologica')} onChange={(e) => set('anamnesi_fisiologica', e.target.value)} /></div>
          <div><Label className="text-xs">Anamnesi patologica remota</Label><Textarea rows={3} value={field('anamnesi_patologica_remota')} onChange={(e) => set('anamnesi_patologica_remota', e.target.value)} /></div>
          <div><Label className="text-xs">Anamnesi patologica prossima</Label><Textarea rows={3} value={field('anamnesi_patologica_prossima')} onChange={(e) => set('anamnesi_patologica_prossima', e.target.value)} /></div>
          <div className="md:col-span-2"><Label className="text-xs">Anamnesi lavorativa (mansioni pregresse, rischi, esposizioni)</Label><Textarea rows={3} value={field('anamnesi_lavorativa')} onChange={(e) => set('anamnesi_lavorativa', e.target.value)} /></div>
        </section>

        <section className="grid md:grid-cols-3 gap-3">
          <div><Label className="text-xs">Fumo</Label><Textarea rows={2} value={field('abitudini_fumo')} onChange={(e) => set('abitudini_fumo', e.target.value)} placeholder="Es. 10 sig./die dal 2010" /></div>
          <div><Label className="text-xs">Alcol</Label><Textarea rows={2} value={field('abitudini_alcol')} onChange={(e) => set('abitudini_alcol', e.target.value)} /></div>
          <div><Label className="text-xs">Attività sportiva</Label><Textarea rows={2} value={field('abitudini_sport')} onChange={(e) => set('abitudini_sport', e.target.value)} /></div>
        </section>

        <section className="grid md:grid-cols-2 gap-3">
          <div><Label className="text-xs">Allergie</Label><Textarea rows={2} value={field('allergie')} onChange={(e) => set('allergie', e.target.value)} /></div>
          <div><Label className="text-xs">Terapie in corso</Label><Textarea rows={2} value={field('terapie_in_corso')} onChange={(e) => set('terapie_in_corso', e.target.value)} /></div>
          <div><Label className="text-xs">Vaccinazioni</Label><Textarea rows={2} value={field('vaccinazioni')} onChange={(e) => set('vaccinazioni', e.target.value)} /></div>
          <div><Label className="text-xs">Interventi chirurgici</Label><Textarea rows={2} value={field('interventi_chirurgici')} onChange={(e) => set('interventi_chirurgici', e.target.value)} /></div>
        </section>

        <div>
          <Label className="text-xs">Note</Label>
          <Textarea rows={2} value={field('notes')} onChange={(e) => set('notes', e.target.value)} />
        </div>
      </CardContent>
    </Card>
  );
};
