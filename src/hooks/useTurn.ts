import { useTurnStore } from "@/store/useTurnStore";
import { useAuth } from "@/context/AuthContext";

export function useTurn() {
  const { user, storeId } = useAuth();
  
  const activeTurn = useTurnStore(state => state.activeTurn);
  const isLoading = useTurnStore(state => state.isLoading);
  
  const openTurn = useTurnStore(state => state.openTurn);
  const closeTurn = useTurnStore(state => state.closeTurn);
  const pauseTurn = useTurnStore(state => state.pauseTurn);
  const resumeTurn = useTurnStore(state => state.resumeTurn);
  const reopenTurn = useTurnStore(state => state.reopenTurn);

  return {
    activeTurn,
    isLoading,
    openTurn: (amount: number) => openTurn(amount, user, storeId),
    closeTurn,
    pauseTurn,
    resumeTurn,
    reopenTurn
  };
}
