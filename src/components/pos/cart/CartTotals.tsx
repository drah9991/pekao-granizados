import type { ComponentType } from "react";
import { Button } from "@astryxdesign/core/Button";
import { ClickableCard } from "@astryxdesign/core/ClickableCard";
import { Grid } from "@astryxdesign/core/Grid";
import { HStack } from "@astryxdesign/core/HStack";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { CreditCard, Receipt, Smartphone, Split, Wallet, type LucideProps } from "lucide-react";
import { formatCOP } from "@/lib/currency";
import { DiscountField } from "./DiscountField";

interface CartTotalsProps {
  subtotal: number;
  discount: number;
  setDiscount: (discount: number) => void;
  discountType: "percent" | "fixed";
  setDiscountType: (type: "percent" | "fixed") => void;
  discountAmount: number;
  total: number;
  onQuickPayment: (method: string) => void;
  onCheckout: () => void;
  onSplitPayment: () => void;
}

type TileVariant = "green" | "blue" | "purple" | "orange";

interface PaymentTile {
  key: string;
  title: string;
  hint: string;
  icon: ComponentType<LucideProps>;
  variant: TileVariant;
}

// Cada método conserva su color para reconocerlo de un vistazo en la caja.
const PAYMENT_TILES: PaymentTile[] = [
  { key: "cash", title: "Efectivo", hint: "Pago directo", icon: Wallet, variant: "green" },
  { key: "card", title: "Tarjeta", hint: "Datáfono", icon: CreditCard, variant: "blue" },
  { key: "transfer", title: "Transfer.", hint: "Nequi / Davi", icon: Smartphone, variant: "purple" },
  { key: "split", title: "Dividir", hint: "Varios pagos", icon: Split, variant: "orange" },
];

function TotalsSummary({ subtotal, discountAmount, total }: Pick<CartTotalsProps, "subtotal" | "discountAmount" | "total">) {
  // Bloque de total destacado: identidad propia de Pekao, sin equivalente en Astryx.
  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-primary/40 bg-gradient-to-br from-primary/15 via-primary/5 to-card/90 p-4 sm:p-5 shadow-lg shadow-primary/5">
      <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-primary/20 blur-2xl" />
      <div className="flex justify-between items-center text-xs font-semibold text-muted-foreground pb-2.5 border-b border-border/40">
        <span className="uppercase tracking-wider">Subtotal</span>
        <span className="font-bold text-foreground tabular-nums text-sm">{formatCOP(subtotal)}</span>
      </div>
      {discountAmount > 0 && (
        <div className="flex justify-between items-center text-xs font-semibold text-rose-500 pt-2 pb-1 border-b border-border/40">
          <span className="uppercase tracking-wider">Descuento</span>
          <span className="font-bold tabular-nums text-sm">-{formatCOP(discountAmount)}</span>
        </div>
      )}
      <div className="pt-3 flex flex-col gap-1.5">
        <span className="inline-flex w-fit items-center gap-1.5 text-xs sm:text-sm font-black uppercase tracking-widest text-primary bg-primary/15 px-2.5 py-1 rounded-full border border-primary/25">
          <Receipt className="w-3.5 h-3.5" /> Total a Pagar
        </span>
        <span className="text-right text-4xl sm:text-5xl font-black text-foreground tracking-tight tabular-nums drop-shadow-sm block leading-none mt-1">
          {formatCOP(total)}
        </span>
      </div>
    </div>
  );
}

export function CartTotals({
  subtotal,
  discount,
  setDiscount,
  discountType,
  setDiscountType,
  discountAmount,
  total,
  onQuickPayment,
  onCheckout,
  onSplitPayment,
}: CartTotalsProps) {
  const handleTile = (key: string) => (key === "split" ? onSplitPayment() : onQuickPayment(key));

  return (
    <VStack gap={4}>
      <DiscountField
        discount={discount}
        setDiscount={setDiscount}
        discountType={discountType}
        setDiscountType={setDiscountType}
      />

      <TotalsSummary subtotal={subtotal} discountAmount={discountAmount} total={total} />

      <VStack gap={2}>
        <Text type="label" color="secondary">Método de Pago Rápido</Text>
        <Grid columns={2} gap={2}>
          {PAYMENT_TILES.map(({ key, title, hint, icon: Icon, variant }) => (
            <ClickableCard key={key} label={title} variant={variant} padding={3} onClick={() => handleTile(key)}>
              <HStack gap={3} vAlign="center">
                <Icon className="size-6 shrink-0" color={`var(--color-icon-${variant})`} aria-hidden />
                <VStack gap={0.5}>
                  <Text weight="bold">{title}</Text>
                  <Text type="supporting">{hint}</Text>
                </VStack>
              </HStack>
            </ClickableCard>
          ))}
        </Grid>
      </VStack>

      <Button
        variant="primary"
        size="lg"
        width="100%"
        label="Completar Pedido"
        icon={<Receipt size={20} />}
        // Sin el wrapper, el evento del clic llegaba a onCheckout como método de pago.
        onClick={() => onCheckout()}
      />
    </VStack>
  );
}
