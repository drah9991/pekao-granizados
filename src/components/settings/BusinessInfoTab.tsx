import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";

interface BusinessInfoTabProps {
  storeName: string; setStoreName: (v: string) => void;
  nitDoc: string; setNitDoc: (v: string) => void;
  contactName: string; setContactName: (v: string) => void;
  email: string; setEmail: (v: string) => void;
  address: string; setAddress: (v: string) => void;
  country: string; setCountry: (v: string) => void;
  state: string; setState: (v: string) => void;
  city: string; setCity: (v: string) => void;
  phone: string; setPhone: (v: string) => void;
  website: string; setWebsite: (v: string) => void;
  flagBillingElectronic: boolean; setFlagBillingElectronic: (v: boolean) => void;
  flagIngredients: boolean; setFlagIngredients: (v: boolean) => void;
  flagMesas: boolean; setFlagMesas: (v: boolean) => void;
  flagDelivery: boolean; setFlagDelivery: (v: boolean) => void;
  logoPreview: string | null; setLogoPreview: (v: string | null) => void;
}

/**
 * Subtab "Negocio" de BusinessSettings.tsx, extraída sin cambios de
 * comportamiento.
 */
export function BusinessInfoTab({
  storeName, setStoreName,
  nitDoc, setNitDoc,
  contactName, setContactName,
  email, setEmail,
  address, setAddress,
  country, setCountry,
  state, setState,
  city, setCity,
  phone, setPhone,
  website, setWebsite,
  flagBillingElectronic, setFlagBillingElectronic,
  flagIngredients, setFlagIngredients,
  flagMesas, setFlagMesas,
  flagDelivery, setFlagDelivery,
  logoPreview, setLogoPreview,
}: BusinessInfoTabProps) {
  return (
    <motion.div
      key="business"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className="space-y-6"
    >
      <Card className="bg-slate-950/40 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
        <CardHeader className="p-0 pb-4 mb-6 border-b border-white/5 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-black italic uppercase font-space-grotesk tracking-widest text-foreground">Información del Negocio</CardTitle>
            <CardDescription className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest italic leading-none font-space-grotesk mt-1">Configura la razón social y datos de contacto de tu sucursal</CardDescription>
          </div>
          <div className="text-[10px] font-black uppercase text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded italic font-space-grotesk">
            Plan Actual: UNIVERSAL
          </div>
        </CardHeader>
        <CardContent className="p-0 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[9px] font-black uppercase tracking-widest text-slate-300">Nombre del Negocio *</Label>
              <Input value={storeName} onChange={(e) => setStoreName(e.target.value.toUpperCase())} className="bg-slate-900 border-white/10 rounded-lg text-xs" />
            </div>
            <div className="space-y-2">
              <Label className="text-[9px] font-black uppercase tracking-widest text-slate-300">NIT / Doc *</Label>
              <Input value={nitDoc} onChange={(e) => setNitDoc(e.target.value)} className="bg-slate-900 border-white/10 rounded-lg text-xs" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[9px] font-black uppercase tracking-widest text-slate-300">Contacto</Label>
              <Input value={contactName} onChange={(e) => setContactName(e.target.value)} className="bg-slate-900 border-white/10 rounded-lg text-xs" />
            </div>
            <div className="space-y-2">
              <Label className="text-[9px] font-black uppercase tracking-widest text-slate-300">Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-slate-900 border-white/10 rounded-lg text-xs" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-[9px] font-black uppercase tracking-widest text-slate-300">Dirección</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} className="bg-slate-900 border-white/10 rounded-lg text-xs" />
            </div>
            <div className="space-y-2">
              <Label className="text-[9px] font-black uppercase tracking-widest text-slate-300">País</Label>
              <select value={country} onChange={(e) => setCountry(e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded-lg p-2.5 text-xs text-foreground">
                <option value="Colombia">Colombia</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-[9px] font-black uppercase tracking-widest text-slate-300">Departamento</Label>
              <Input value={state} onChange={(e) => setState(e.target.value)} className="bg-slate-900 border-white/10 rounded-lg text-xs" placeholder="Ej: Antioquia" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-[9px] font-black uppercase tracking-widest text-slate-300">Ciudad</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} className="bg-slate-900 border-white/10 rounded-lg text-xs" placeholder="Ej: Medellín" />
            </div>
            <div className="space-y-2">
              <Label className="text-[9px] font-black uppercase tracking-widest text-slate-300">Teléfono</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="bg-slate-900 border-white/10 rounded-lg text-xs" />
            </div>
            <div className="space-y-2">
              <Label className="text-[9px] font-black uppercase tracking-widest text-slate-300">Página Web</Label>
              <Input value={website} onChange={(e) => setWebsite(e.target.value)} className="bg-slate-900 border-white/10 rounded-lg text-xs" placeholder="https://" />
            </div>
          </div>

          {/* Checkboxes Operativos */}
          <div className="space-y-3 pt-4 border-t border-white/5">
            <div className="flex items-center gap-3">
              <input type="checkbox" id="bill-elec" checked={flagBillingElectronic} onChange={(e) => setFlagBillingElectronic(e.target.checked)} className="w-4 h-4 rounded border-white/10 bg-slate-900 text-primary cursor-pointer" />
              <Label htmlFor="bill-elec" className="text-xs text-slate-300 cursor-pointer font-bold">Maneja Facturación Electrónica con Loggro Proveedor Tecnológico</Label>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="ingredients-check" checked={flagIngredients} onChange={(e) => setFlagIngredients(e.target.checked)} className="w-4 h-4 rounded border-white/10 bg-slate-900 text-primary cursor-pointer" />
              <Label htmlFor="ingredients-check" className="text-xs text-slate-300 cursor-pointer font-bold">Productos con ingredientes</Label>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="tables-check" checked={flagMesas} onChange={(e) => setFlagMesas(e.target.checked)} className="w-4 h-4 rounded border-white/10 bg-slate-900 text-primary cursor-pointer" />
              <Label htmlFor="tables-check" className="text-xs text-slate-300 cursor-pointer font-bold">Utilizo mesas</Label>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="delivery-check" checked={flagDelivery} onChange={(e) => setFlagDelivery(e.target.checked)} className="w-4 h-4 rounded border-white/10 bg-slate-900 text-primary cursor-pointer" />
              <Label htmlFor="delivery-check" className="text-xs text-slate-300 cursor-pointer font-bold">Envío a domicilio</Label>
            </div>
          </div>

          {/* Cargar Logo */}
          <div className="space-y-2 pt-4 border-t border-white/5">
            <Label className="text-[9px] font-black uppercase tracking-widest text-slate-300">Cargar logo</Label>
            <div className="flex items-center gap-4">
              <Input type="file" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onloadend = () => setLogoPreview(reader.result as string);
                  reader.readAsDataURL(file);
                }
              }} className="bg-slate-900 border-white/10 rounded-lg text-xs" />
              {logoPreview && (
                <img src={logoPreview} alt="Logo" className="w-16 h-10 object-contain border border-white/10 rounded-lg p-1 bg-white/5" />
              )}
            </div>
            <p className="text-[8px] text-muted-foreground uppercase font-bold tracking-widest">Recomendada: 90x60. Refresque la página después de guardar para ver los cambios.</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
