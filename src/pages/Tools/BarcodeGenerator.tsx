import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ArrowRight, Barcode, Download, Link as LinkIcon } from 'lucide-react';
import ReactBarcode from 'react-barcode';
import { Link } from 'react-router-dom';

export default function BarcodeGenerator() {
  const [value, setValue] = useState('PEKAO-12345');
  const [format, setFormat] = useState('CODE128');

  const handleDownload = () => {
    const svg = document.getElementById('barcode-svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width + 40;
      canvas.height = img.height + 40;
      if (ctx) {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 20, 20);
      }
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `barcode-${value}.png`;
      downloadLink.href = `${pngFile}`;
      downloadLink.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center py-12 px-4 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-[500px] bg-primary/5 rounded-full blur-[100px] opacity-50 pointer-events-none" />
      
      <div className="w-full max-w-2xl relative z-10 space-y-8 animate-in fade-in slide-in-from-bottom-8">
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Barcode className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight">Generador de Códigos de Barras</h1>
          <p className="text-lg text-muted-foreground">Crea códigos de barras profesionales al instante, 100% gratis y sin registro.</p>
        </div>

        <Card className="p-8 border shadow-xl bg-card/80 backdrop-blur-xl">
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="barcode-value" className="text-base">¿Qué deseas codificar?</Label>
              <Input 
                id="barcode-value" 
                value={value} 
                onChange={(e) => setValue(e.target.value)} 
                className="h-14 text-lg"
                placeholder="Escribe el SKU, enlace o número..."
              />
            </div>

            <div className="bg-white p-8 rounded-xl flex items-center justify-center min-h-[200px] border">
              {value ? (
                <div id="barcode-svg" className="scale-110">
                  <ReactBarcode value={value} format={format} background="#ffffff" displayValue={true} />
                </div>
              ) : (
                <p className="text-muted-foreground">Escribe algo para generar el código</p>
              )}
            </div>

            <Button className="w-full h-12 text-lg gap-2" onClick={handleDownload} disabled={!value}>
              <Download className="w-5 h-5" />
              Descargar Imagen PNG
            </Button>
          </div>
        </Card>

        {/* Lead Magnet CTA */}
        <div className="mt-12 bg-primary/10 border border-primary/20 rounded-2xl p-8 text-center space-y-4">
          <h3 className="text-2xl font-bold">¿Tienes un negocio y muchos códigos?</h3>
          <p className="text-muted-foreground text-lg">
            Imprimir códigos uno por uno es agotador. Con <strong>Pekao Central</strong> puedes generar, imprimir en masa y cobrar con lector de código de barras todo tu inventario.
          </p>
          <Link to="/auth">
            <Button size="lg" className="mt-4 gap-2 text-base px-8 h-14">
              Prueba Pekao Central Gratis
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
