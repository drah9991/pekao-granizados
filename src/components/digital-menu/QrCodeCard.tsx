import { Download } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface QrCodeCardProps {
  qrCodeUrl: string;
  businessUrl: string;
}

export function QrCodeCard({ qrCodeUrl, businessUrl }: QrCodeCardProps) {
  return (
    <Card className="bg-slate-950/40 border border-white/10 rounded-2xl p-6 backdrop-blur-md flex flex-col md:flex-row items-center gap-8">
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-inner">
        <img src={qrCodeUrl} alt="Menú QR" className="w-36 h-36 rounded-xl" />
      </div>
      <div className="flex-1 space-y-3 text-center md:text-left">
        <h4 className="text-sm font-black uppercase tracking-widest text-primary italic">Descarga tú código QR y pégalo en un lugar visible:</h4>
        <p className="text-[10px] text-muted-foreground leading-relaxed uppercase tracking-wider font-semibold">
          Descarga el código QR, imprímelo y pégalo en un lugar visible para tus clientes. Los clientes que vean el código pueden con la cámara de su celular escanearlo y los dirigirá a tu Menú Digital para que realicen pedidos.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <a
            href={qrCodeUrl}
            download="codigo_qr_menu.png"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 bg-primary text-white font-space-grotesk text-xs uppercase tracking-widest py-3 px-6 rounded-xl shadow-glow-pro hover:opacity-90"
          >
            <Download className="w-4 h-4" />
            Descargar QR
          </a>
          <Button
            variant="outline"
            onClick={() => {
              navigator.clipboard.writeText(businessUrl);
              toast.success("Enlace del Menú copiado al portapapeles.");
            }}
            className="border-white/10 bg-white/5 font-space-grotesk text-xs uppercase tracking-widest px-6"
          >
            Copiar Enlace
          </Button>
        </div>
      </div>
    </Card>
  );
}
