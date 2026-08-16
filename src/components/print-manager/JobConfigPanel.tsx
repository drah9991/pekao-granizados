import type React from 'react';
import OriginSelector from './OriginSelector';
import ServiceToggles from './ServiceToggles';
import AttributeToggles from './AttributeToggles';
import PageCounters from './PageCounters';
import type { ColorMode, OriginType, PaperSize } from './types';

interface JobConfigPanelProps {
  origin: OriginType;
  setOrigin: (origin: OriginType) => void;
  isCedula: boolean;
  setIsCedula: (value: boolean) => void;
  cedulaQty: number;
  setCedulaQty: React.Dispatch<React.SetStateAction<number>>;
  isCopia: boolean;
  setIsCopia: (value: boolean) => void;
  pricing: Record<string, any>;
  colorMode: ColorMode;
  setColorMode: (mode: ColorMode) => void;
  paperSize: PaperSize;
  setPaperSize: (size: PaperSize) => void;
  pages: number;
  setPages: React.Dispatch<React.SetStateAction<number>>;
  sets: number;
  setSets: React.Dispatch<React.SetStateAction<number>>;
  handleFastAdd: (amount: number) => void;
}

export default function JobConfigPanel({
  origin,
  setOrigin,
  isCedula,
  setIsCedula,
  cedulaQty,
  setCedulaQty,
  isCopia,
  setIsCopia,
  pricing,
  colorMode,
  setColorMode,
  paperSize,
  setPaperSize,
  pages,
  setPages,
  sets,
  setSets,
  handleFastAdd
}: JobConfigPanelProps) {
  return (
    <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 p-6 rounded-2xl shadow-2xl flex flex-col gap-5">
      <OriginSelector origin={origin} setOrigin={setOrigin} />

      {/* Selección de Servicios (Cédula / Copia) */}
      {origin === 'physical' && (
        <ServiceToggles
          isCedula={isCedula}
          setIsCedula={setIsCedula}
          cedulaQty={cedulaQty}
          setCedulaQty={setCedulaQty}
          isCopia={isCopia}
          setIsCopia={setIsCopia}
          pricing={pricing}
        />
      )}

      {/* Atributos (Modo de Color y Tamaño de Papel) */}
      {origin !== 'scanner' && (
        <AttributeToggles
          origin={origin}
          isCopia={isCopia}
          colorMode={colorMode}
          setColorMode={setColorMode}
          paperSize={paperSize}
          setPaperSize={setPaperSize}
        />
      )}

      {/* Contadores Numéricos */}
      <PageCounters
        origin={origin}
        isCopia={isCopia}
        pages={pages}
        setPages={setPages}
        sets={sets}
        setSets={setSets}
        handleFastAdd={handleFastAdd}
      />
    </div>
  );
}
