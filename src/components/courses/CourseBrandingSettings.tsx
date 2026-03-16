import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Settings, Upload, Trash2, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface BrandingSettings {
  id?: string;
  company_name?: string;
  company_address?: string;
  company_phone?: string;
  company_email?: string;
  company_pec?: string;
  company_vat?: string;
  company_fiscal_code?: string;
  company_website?: string;
  logo_path?: string;
  footer_text?: string;
}

export function useCourseBranding() {
  const { user } = useAuth();
  const [branding, setBranding] = useState<BrandingSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('course_branding_settings')
        .select('*')
        .limit(1)
        .maybeSingle();
      setBranding(data as BrandingSettings | null);
      setLoading(false);
    })();
  }, [user]);

  const logoUrl = branding?.logo_path
    ? supabase.storage.from('course-branding').getPublicUrl(branding.logo_path).data.publicUrl
    : null;

  return { branding, logoUrl, loading };
}

export default function CourseBrandingSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [settings, setSettings] = useState<BrandingSettings>({});
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !user) return;
    loadSettings();
  }, [open, user]);

  async function loadSettings() {
    const { data } = await supabase
      .from('course_branding_settings')
      .select('*')
      .limit(1)
      .maybeSingle();
    if (data) {
      setSettings(data as BrandingSettings);
      if (data.logo_path) {
        const url = supabase.storage.from('course-branding').getPublicUrl(data.logo_path).data.publicUrl;
        setLogoPreview(url);
      }
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${user.id}/logo.${ext}`;
    const { error } = await supabase.storage.from('course-branding').upload(path, file, { upsert: true });
    if (error) {
      toast({ title: 'Errore upload logo', variant: 'destructive' });
    } else {
      setSettings(s => ({ ...s, logo_path: path }));
      setLogoPreview(URL.createObjectURL(file));
    }
    setUploading(false);
  }

  async function removeLogo() {
    if (settings.logo_path) {
      await supabase.storage.from('course-branding').remove([settings.logo_path]);
    }
    setSettings(s => ({ ...s, logo_path: undefined }));
    setLogoPreview(null);
  }

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    const payload = {
      user_id: user.id,
      company_name: settings.company_name || null,
      company_address: settings.company_address || null,
      company_phone: settings.company_phone || null,
      company_email: settings.company_email || null,
      company_pec: settings.company_pec || null,
      company_vat: settings.company_vat || null,
      company_fiscal_code: settings.company_fiscal_code || null,
      company_website: settings.company_website || null,
      logo_path: settings.logo_path || null,
      footer_text: settings.footer_text || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('course_branding_settings')
      .upsert(payload, { onConflict: 'user_id' });

    if (error) {
      toast({ title: 'Errore salvataggio', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Impostazioni salvate' });
      setOpen(false);
    }
    setSaving(false);
  }

  const field = (label: string, key: keyof BrandingSettings, placeholder?: string) => (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input
        value={(settings[key] as string) || ''}
        onChange={e => setSettings(s => ({ ...s, [key]: e.target.value }))}
        placeholder={placeholder}
        className="h-8 text-sm"
      />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Building2 className="h-4 w-4" /> Personalizza Template
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" /> Personalizzazione Template PDF
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Logo */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm">Logo Aziendale</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="flex items-center gap-4">
                {logoPreview ? (
                  <div className="relative">
                    <img src={logoPreview} alt="Logo" className="h-16 max-w-[200px] object-contain rounded border p-1" />
                    <Button size="icon" variant="destructive" className="absolute -top-2 -right-2 h-6 w-6" onClick={removeLogo}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                    <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                    <span className="text-xs text-muted-foreground">
                      {uploading ? 'Caricamento...' : 'Carica logo (PNG, JPG)'}
                    </span>
                    <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} disabled={uploading} />
                  </label>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Company Info */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm">Dati Aziendali</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              {field('Ragione Sociale', 'company_name', 'Nome azienda')}
              {field('Indirizzo', 'company_address', 'Via, CAP, Città')}
              <div className="grid grid-cols-2 gap-2">
                {field('Telefono', 'company_phone', '+39...')}
                {field('Email', 'company_email', 'info@...')}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {field('PEC', 'company_pec', 'pec@...')}
                {field('Sito Web', 'company_website', 'www...')}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {field('P.IVA', 'company_vat', 'IT...')}
                {field('Codice Fiscale', 'company_fiscal_code')}
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm">Testo Footer</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <Textarea
                value={settings.footer_text || ''}
                onChange={e => setSettings(s => ({ ...s, footer_text: e.target.value }))}
                placeholder="Testo personalizzato per il piè di pagina dei documenti..."
                rows={2}
                className="text-sm"
              />
            </CardContent>
          </Card>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? 'Salvataggio...' : 'Salva Impostazioni'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
