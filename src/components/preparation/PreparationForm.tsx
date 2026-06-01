import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Beaker, Scale } from "lucide-react";
import YieldProjection from "./YieldProjection";

interface PreparationFormProps {
  products: Record<string, unknown>[];
  selectedProductId: string;
  onProductChange: (id: string) => void;
  liters: string;
  onLitersChange: (l: string) => void;
  currentStock: number | null;
  mixtureName: string | null;
  onAutoLink: () => void;
  onEmptyTank: () => void;
  onRegister: () => void;
  isProcessing: boolean;
  isEmptying: boolean;
  sizes: Record<string, unknown>[];
}

export default function PreparationForm({
  products, selectedProductId, onProductChange,
  liters, onLitersChange, currentStock, mixtureName,
  onAutoLink, onEmptyTank, onRegister,
  isProcessing, isEmptying, sizes
}: PreparationFormProps) {
  const selectedFlavor = products.find(p => p.id === selectedProductId);

  return (
    <Card className="glass-pro border-white/10 shadow-pro rounded-[2.5rem] overflow-hidden group">
        <CardHeader className="bg-primary/5 border-b border-white/5 py-10 relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
            <CardTitle className="font-space-grotesk italic uppercase tracking-tighter text-xl lg:text-2xl flex items-center gap-2 relative z-10">
                <Beaker className="w-6 h-6 text-primary" />
                Nueva Preparación
            </CardTitle>
            <CardDescription className="text-primary/60 font-black uppercase text-[10px] tracking-widest relative z-10">
                Indica el volumen total preparado para sumarlo al stock
            </CardDescription>
        </CardHeader>
        <CardContent className="p-10 space-y-8">
            <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60 ml-2 italic">SELECCIONAR SABOR (SISTEMA)</Label>
                <Select value={selectedProductId} onValueChange={onProductChange}>
                    <SelectTrigger className="h-14 lg:h-16 rounded-2xl bg-muted/40 border-border focus:border-primary/50 text-base lg:text-lg font-black font-space-grotesk italic uppercase tracking-wider text-foreground transition-all shadow-inner">
                        <SelectValue placeholder="Elige un granizado..." />
                    </SelectTrigger>
                    <SelectContent className="glass-pro border-border">
                        {products.map(p => (
                            <SelectItem key={p.id} value={p.id} className="font-black font-space-grotesk italic uppercase tracking-wider text-xs">
                                {p.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {selectedFlavor && (
                <div className="space-y-4 animate-pro-in">
                    <div className="p-6 bg-muted/40 border border-border rounded-[2rem] relative overflow-hidden group/stock">
                        <div className="absolute top-0 right-0 w-32 h-full bg-primary/5 -skew-x-12 translate-x-32 group-hover/stock:translate-x-0 transition-transform duration-700" />
                        <div className="relative z-10 flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-[9px] font-black uppercase tracking-widest text-primary italic">Stock Actual en Tanque</p>
                                <div className="flex items-center gap-4">
                                    <p className="text-xl lg:text-3xl font-black font-space-grotesk italic tracking-tighter text-foreground">
                                        {currentStock !== null 
                                            ? (
                                                <>
                                                    {(currentStock / 1000).toFixed(1)} <span className="text-sm opacity-40">L</span>
                                                    <span className="text-xs text-primary/40 ml-3 italic">
                                                        ({(currentStock / 29.57).toFixed(1)} oz)
                                                    </span>
                                                </>
                                            ) : (
                                                <span className="text-sm font-black text-red-500 uppercase tracking-widest animate-pulse">🔴 SIN TANQUE VINCULADO</span>
                                            )}
                                    </p>
                                </div>
                            </div>
                            {currentStock === null ? (
                                <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={onAutoLink}
                                    className="h-12 px-6 rounded-xl border-primary/50 text-primary hover:bg-primary/10 font-black uppercase text-[10px] tracking-widest transition-all shadow-glow-pro"
                                >
                                    Vincular Ahora
                                </Button>
                            ) : currentStock > 0 && (
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={onEmptyTank}
                                    disabled={isEmptying}
                                    className="h-10 px-6 rounded-xl appetite-accent-muted border-none font-black uppercase text-[9px] tracking-widest transition-all"
                                >
                                    {isEmptying ? "..." : "VACÍAR"}
                                </Button>
                            )}
                        </div>
                    </div>
                    
                    {mixtureName && (
                        <p className="text-[9px] text-muted-foreground/40 font-black uppercase tracking-[0.4em] px-4 font-space-grotesk italic text-center">
                            Insumo Vinculado: <span className="text-primary">{mixtureName}</span>
                        </p>
                    )}
                </div>
            )}

            <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60 ml-2 italic">VOLUMEN PREPARADO (LITROS)</Label>
                <div className="relative group">
                    <Input 
                        type="number" 
                        step="0.5" 
                        placeholder="0.0" 
                        className="h-14 lg:h-16 rounded-2xl bg-muted/40 border-border focus:border-primary/50 text-2xl lg:text-4xl font-black font-space-grotesk italic tracking-tighter px-6 pr-16 text-foreground transition-all shadow-inner"
                        value={liters}
                        onChange={(e) => onLitersChange(e.target.value)}
                    />
                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-2xl font-black text-primary group-focus-within:text-white transition-colors font-space-grotesk italic">L</span>
                </div>
            </div>

            {liters && selectedProductId && (
                <YieldProjection 
                    liters={liters} 
                    selectedFlavor={selectedFlavor} 
                    sizes={sizes} 
                />
            )}

            <Button 
                onClick={onRegister}
                disabled={isProcessing || !liters || !selectedProductId}
                className="w-full h-16 lg:h-20 rounded-[2rem] bg-foreground text-background hover:bg-primary hover:text-primary-foreground font-black uppercase tracking-[0.4em] text-sm italic font-space-grotesk transition-all shadow-glow-pro active:scale-95 group overflow-hidden relative"
            >
                <span className="relative z-10">{isProcessing ? "PROCESANDO LOTE..." : "CONFIRMAR PRODUCCIÓN"}</span>
                <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-white/20 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            </Button>
        </CardContent>
    </Card>
  );
}
