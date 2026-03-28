import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useCourses } from "@/hooks/useCourses";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseTypes: { value: string; label: string }[];
  onCourseCreated?: () => void;
}

const AddCourseDialog = ({ open, onOpenChange, courseTypes, onCourseCreated }: Props) => {
  const { createCourse } = useCourses();
  const [form, setForm] = useState({
    name: "",
    course_type: "sicurezza",
    description: "",
    duration_hours: "",
    max_participants: "",
    is_mandatory: false,
    renewal_months: "",
    category: "",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    await createCourse({
      name: form.name.trim(),
      course_type: form.course_type,
      description: form.description || null,
      duration_hours: form.duration_hours ? Number(form.duration_hours) : null,
      max_participants: form.max_participants ? Number(form.max_participants) : null,
      is_mandatory: form.is_mandatory,
      renewal_months: form.renewal_months ? Number(form.renewal_months) : null,
      category: form.category || null,
    });
    setSaving(false);
    setForm({ name: "", course_type: "sicurezza", description: "", duration_hours: "", max_participants: "", is_mandatory: false, renewal_months: "", category: "" });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuovo Corso</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Nome Corso *</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tipo</Label>
              <Select value={form.course_type} onValueChange={v => setForm(f => ({ ...f, course_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {courseTypes.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Durata (ore)</Label>
              <Input type="number" value={form.duration_hours} onChange={e => setForm(f => ({ ...f, duration_hours: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Max Partecipanti</Label>
              <Input type="number" value={form.max_participants} onChange={e => setForm(f => ({ ...f, max_participants: e.target.value }))} />
            </div>
            <div>
              <Label>Rinnovo (mesi)</Label>
              <Input type="number" value={form.renewal_months} onChange={e => setForm(f => ({ ...f, renewal_months: e.target.value }))} placeholder="es. 60" />
            </div>
          </div>
          <div>
            <Label>Descrizione</Label>
            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={form.is_mandatory} onCheckedChange={v => setForm(f => ({ ...f, is_mandatory: v }))} />
            <Label>Formazione obbligatoria (D.Lgs 81/08)</Label>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Salvataggio...' : 'Crea Corso'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddCourseDialog;
