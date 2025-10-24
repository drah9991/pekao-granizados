export interface Topping {
  id: string;
  name: string;
  price: number;
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  size?: string;
  toppings?: Topping[];
  customizationId?: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  emoji: string;
  color: string;
}

export interface Size {
  id: string;
  name: string;
  multiplier: number;
}