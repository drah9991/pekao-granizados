import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Plus, History } from "lucide-react";
import { useInventory } from "@/hooks/useInventory";
import { InventoryKPIs } from "@/components/inventory/InventoryKPIs";
import { InventoryFilters } from "@/components/inventory/InventoryFilters";
import { InventoryGrid } from "@/components/inventory/InventoryGrid";
import { InventoryDialogs } from "@/components/inventory/InventoryDialogs";
import { MovementsLedger } from "@/components/inventory/MovementsLedger";
import { PurchaseEntryDialog } from "@/components/inventory/PurchaseEntryDialog";

export default function Inventory() {
  const inventory = useInventory();
  const { adjustDialog, purchaseDialog, movementFilters } = inventory;

  return (
    <Layout>
      <div className="min-h-screen bg-transparent text-foreground p-6 lg:p-10 space-y-10">
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
              onClick={() => purchaseDialog.setIsOpen(true)}
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

        <InventoryKPIs stats={inventory.stats} />

        <InventoryFilters
          searchQuery={inventory.searchQuery}
          setSearchQuery={inventory.setSearchQuery}
          selectedStore={inventory.selectedStore}
          setSelectedStore={inventory.setSelectedStore}
          filterProductType={inventory.filterProductType}
          setFilterProductType={inventory.setFilterProductType}
          filterLowStock={inventory.filterLowStock}
          setFilterLowStock={inventory.setFilterLowStock}
          stores={inventory.stores}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 shadow-pro">
            <InventoryGrid
              items={inventory.filteredItems}
              onAdjust={adjustDialog.openAdjustDialog}
              loading={inventory.loading}
            />
          </div>

          <MovementsLedger
            movements={inventory.filteredMovements}
            suppliers={inventory.suppliers}
            filterType={movementFilters.type}
            setFilterType={movementFilters.setType}
            filterSupplier={movementFilters.supplier}
            setFilterSupplier={movementFilters.setSupplier}
            filterInvoice={movementFilters.invoice}
            setFilterInvoice={movementFilters.setInvoice}
          />
        </div>

        <InventoryDialogs
          isOpen={adjustDialog.isOpen}
          onClose={() => adjustDialog.setIsOpen(false)}
          selectedItem={adjustDialog.selectedItem}
          adjustmentType={adjustDialog.adjustmentType}
          setAdjustmentType={adjustDialog.setAdjustmentType}
          adjustmentQty={adjustDialog.adjustmentQty}
          setAdjustmentQty={adjustDialog.setAdjustmentQty}
          adjustmentReason={adjustDialog.adjustmentReason}
          setAdjustmentReason={adjustDialog.setAdjustmentReason}
          isProcessing={adjustDialog.isProcessing}
          onConfirm={adjustDialog.handleAdjustStock}
        />

        <PurchaseEntryDialog
          isOpen={purchaseDialog.isOpen}
          onClose={() => purchaseDialog.setIsOpen(false)}
          allProducts={purchaseDialog.allProducts}
          suppliers={inventory.suppliers}
          fecha={purchaseDialog.fecha}
          setFecha={purchaseDialog.setFecha}
          tipo={purchaseDialog.tipo}
          setTipo={purchaseDialog.setTipo}
          facturaNo={purchaseDialog.facturaNo}
          setFacturaNo={purchaseDialog.setFacturaNo}
          nota={purchaseDialog.nota}
          setNota={purchaseDialog.setNota}
          proveedor={purchaseDialog.proveedor}
          setProveedor={purchaseDialog.setProveedor}
          selectedProductForItem={purchaseDialog.selectedProductForItem}
          setSelectedProductForItem={purchaseDialog.setSelectedProductForItem}
          itemQty={purchaseDialog.itemQty}
          setItemQty={purchaseDialog.setItemQty}
          itemTotal={purchaseDialog.itemTotal}
          setItemTotal={purchaseDialog.setItemTotal}
          addedItems={purchaseDialog.addedItems}
          onAddItem={purchaseDialog.addItem}
          onRemoveItem={purchaseDialog.removeItem}
          totalPagado={purchaseDialog.totalPagado}
          setTotalPagado={purchaseDialog.setTotalPagado}
          saleDeCaja={purchaseDialog.saleDeCaja}
          setSaleDeCaja={purchaseDialog.setSaleDeCaja}
          calculatedDebe={purchaseDialog.calculatedDebe}
          isSaving={purchaseDialog.isSaving}
          onSubmit={purchaseDialog.submit}
        />
      </div>
    </Layout>
  );
}
