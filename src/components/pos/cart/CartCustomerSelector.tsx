import CustomerSelection, { Customer } from "@/components/pos/CustomerSelection";
import { Button } from "@/components/ui/button";
import { User as UserIcon, UserX } from "lucide-react";
import { cn } from "@/lib/utils";

interface CartCustomerSelectorProps {
  selectedCustomer: Customer | null;
  setSelectedCustomer: (customer: Customer | null) => void;
}

export function CartCustomerSelector({ selectedCustomer, setSelectedCustomer }: CartCustomerSelectorProps) {
  const isAnonymous = selectedCustomer?.id === 'generic';

  const toggleAnonymous = () => {
    if (isAnonymous) {
      setSelectedCustomer(null);
    } else {
      setSelectedCustomer({
        id: 'generic',
        name: 'Público General',
        document_id: '222222222222',
        phone: null,
        email: null
      });
    }
  };

  return (
    <div className="mb-6 md:mb-10">
      <div className="flex gap-3 items-center">
        <div className="flex-1">
           <CustomerSelection
              selectedCustomer={selectedCustomer}
              onCustomerSelected={setSelectedCustomer}
            />
        </div>
        <Button
          type="button"
          variant={isAnonymous ? "default" : "outline"}
          onClick={toggleAnonymous}
          className={cn(
            "h-14 px-4 flex flex-col gap-1 rounded-xl border transition-all font-dm-sans",
            isAnonymous 
              ? "bg-primary text-white border-primary shadow-glow" 
              : "bg-white/[0.02] border-white/5 text-muted-foreground/60 hover:text-foreground"
          )}
        >
          {isAnonymous ? <UserIcon size={18} /> : <UserX size={18} />}
          <span className="text-[8px] font-bold uppercase tracking-widest">Público</span>
        </Button>
      </div>
    </div>
  );
}
