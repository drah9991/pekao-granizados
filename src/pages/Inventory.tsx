import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Plus, History } from "lucide-react";
import { useInventory } from "@/hooks/useInventory";
import { StockPanel } from "@/components/inventory/StockPanel";
import { MovementsPanel } from "@/components/inventory/MovementsPanel";
import { MovementFormDialog } from "@/components/inventory/MovementFormDialog";

export default function Inventory() {
  const inv = useInventory();

  return (
    <Layout>
      <div className="min-h-screen bg-transparent text-foreground p-6 lg:p-10 space-y-10">
        {/* Header and buttons bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 border-b border-white/5 pb-6">
          <div>
            <h1 className="text-4xl lg:text-5xl font-black tracking-tighter mb-1 bg-gradient-to-r from-foreground via-foreground/80 to-foreground/40 bg-clip-text text-transparent italic uppercase font-space-grotesk">
              INVENTARIO CENTRAL
            </h1>
            <p className="text-primary font-black uppercase tracking-[0.3em] text-[10px] italic font-space-grotesk">
              Gestión de Stock y Movimientos
            </p>
          </div>
          <div className="flex gap-4">
            <Button
              onClick={() => inv.setModalOpen(true)}
              className="bg-primary hover:bg-primary/90 text-white font-black text-xs uppercase tracking-widest px-6 h-12 rounded-xl"
            >
              <Plus className="w-4 h-4 mr-2" /> Nuevo movimiento
            </Button>
            <Button
              variant="outline"
              className="border-white/10 hover:bg-white/5 text-slate-300 font-black text-xs uppercase tracking-widest px-6 h-12 rounded-xl"
            >
              <History className="w-4 h-4 mr-2" /> Ver Logs de Inventario
            </Button>
          </div>
        </div>

        {/* Dashboard Split View */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <StockPanel
            categories={inv.categories}
            selectedCategory={inv.selectedCategory}
            setSelectedCategory={inv.setSelectedCategory}
            searchQuery={inv.searchQuery}
            setSearchQuery={inv.setSearchQuery}
            stockItemsPaginated={inv.stockItemsPaginated}
            filteredStockLength={inv.filteredStock.length}
            stockPage={inv.stockPage}
            setStockPage={inv.setStockPage}
            stockLimit={inv.stockLimit}
          />

          <MovementsPanel
            movementFilterType={inv.movementFilterType}
            setMovementFilterType={inv.setMovementFilterType}
            movementFilterSupplier={inv.movementFilterSupplier}
            setMovementFilterSupplier={inv.setMovementFilterSupplier}
            movementFilterInvoice={inv.movementFilterInvoice}
            setMovementFilterInvoice={inv.setMovementFilterInvoice}
            suppliers={inv.suppliers}
            filteredMovements={inv.filteredMovements}
            totalMovementSum={inv.totalMovementSum}
          />
        </div>

        <MovementFormDialog
          modalOpen={inv.modalOpen}
          setModalOpen={inv.setModalOpen}
          fecha={inv.fecha}
          setFecha={inv.setFecha}
          tipo={inv.tipo}
          setTipo={inv.setTipo}
          facturaNo={inv.facturaNo}
          setFacturaNo={inv.setFacturaNo}
          proveedor={inv.proveedor}
          setProveedor={inv.setProveedor}
          dbSuppliers={inv.dbSuppliers}
          nota={inv.nota}
          setNota={inv.setNota}
          selectedProductForItem={inv.selectedProductForItem}
          setSelectedProductForItem={inv.setSelectedProductForItem}
          allProducts={inv.allProducts}
          itemQty={inv.itemQty}
          setItemQty={inv.setItemQty}
          itemTotal={inv.itemTotal}
          setItemTotal={inv.setItemTotal}
          handleAddItemToMovement={inv.handleAddItemToMovement}
          addedItems={inv.addedItems}
          handleRemoveAddedItem={inv.handleRemoveAddedItem}
          totalPagado={inv.totalPagado}
          setTotalPagado={inv.setTotalPagado}
          calculatedDebe={inv.calculatedDebe}
          saleDeCaja={inv.saleDeCaja}
          setSaleDeCaja={inv.setSaleDeCaja}
          isSaving={inv.isSaving}
          handleSaveMovement={inv.handleSaveMovement}
        />
      </div>
    </Layout>
  );
}
