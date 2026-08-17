import { Bell, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { DigitalMenuConfigForm } from "@/hooks/useDigitalMenuConfigForm";

interface NotifiedUsersCardProps {
  form: DigitalMenuConfigForm;
}

/**
 * Card "Notificar nuevos pedidos a" del tab de configuración del Menú
 * Digital, extraída de src/pages/DigitalMenu.tsx sin cambios de
 * comportamiento.
 */
export function NotifiedUsersCard({ form }: NotifiedUsersCardProps) {
  const {
    profiles,
    selectedUserToNotify, setSelectedUserToNotify,
    notifiedUsers,
    handleAddNotifiedUser,
    handleRemoveNotifiedUser,
  } = form;

  return (
    <Card className="lg:col-span-6 bg-slate-950/40 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
      <CardHeader className="p-0 pb-4 mb-4 border-b border-white/5">
        <CardTitle className="text-sm font-black italic uppercase font-space-grotesk tracking-widest text-foreground flex items-center gap-2">
          <Bell className="w-4 h-4 text-pink-500 animate-swing" />
          Notificar nuevos pedidos a:
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 space-y-4">
        <div className="flex gap-2">
          <select
            value={selectedUserToNotify}
            onChange={(e) => setSelectedUserToNotify(e.target.value)}
            className="flex-1 bg-slate-900 border border-white/10 rounded-lg p-2 text-xs text-foreground focus:ring-1 focus:ring-primary"
          >
            <option value="">Selecciona un usuario...</option>
            {profiles.map(p => (
              <option key={p.id} value={p.id}>{p.full_name || p.email}</option>
            ))}
          </select>
          <Button
            type="button"
            onClick={handleAddNotifiedUser}
            className="bg-primary text-white text-xs uppercase tracking-widest px-4 font-space-grotesk rounded-lg"
          >
            Agregar
          </Button>
        </div>

        <div className="space-y-2">
          {notifiedUsers.length === 0 ? (
            <p className="text-[10px] text-muted-foreground uppercase font-bold text-center py-4 bg-white/[0.02] rounded-xl border border-dashed border-white/5">
              No tiene usuarios asignados para recibir notificaciones.
            </p>
          ) : (
            <div className="space-y-1">
              {notifiedUsers.map(uId => {
                const profile = profiles.find(p => p.id === uId);
                return (
                  <div key={uId} className="flex items-center justify-between p-2.5 rounded-lg bg-white/5 border border-white/5">
                    <span className="text-xs font-bold text-slate-300">
                      {profile ? profile.full_name || profile.email : "Usuario cargando..."}
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleRemoveNotifiedUser(uId)}
                      className="h-7 w-7 text-rose-500 hover:bg-rose-500/10 rounded-lg"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
