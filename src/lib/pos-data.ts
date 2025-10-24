import { Product, Size, Topping } from "./pos-types";

export const sizes: Size[] = [
  { id: "small", name: "Pequeño", multiplier: 0.8 },
  { id: "medium", name: "Mediano", multiplier: 1 },
  { id: "large", name: "Grande", multiplier: 1.3 },
];

export const availableToppings: Topping[] = [
  { id: "condensed", name: "Leche Condensada", price: 0.5 },
  { id: "fruit", name: "Fruta Extra", price: 0.8 },
  { id: "cream", name: "Crema Batida", price: 0.6 },
  { id: "syrup", name: "Jarabe Especial", price: 0.4 },
];

export const products: Product[] = [
  { id: "1", name: "Granizado Fresa", price: 3.5, category: "Clásicos", emoji: "🍓", color: "from-pink-400 to-red-400" },
  { id: "2", name: "Granizado Limón", price: 3.5, category: "Clásicos", emoji: "🍋", color: "from-yellow-300 to-yellow-500" },
  { id: "3", name: "Granizado Frambuesa", price: 4.0, category: "Premium", emoji: "🫐", color: "from-purple-400 to-pink-500" },
  { id: "4", name: "Granizado Mango", price: 4.0, category: "Premium", emoji: "🥭", color: "from-orange-400 to-yellow-400" },
  { id: "5", name: "Granizado Mix", price: 4.5, category: "Especiales", emoji: "🌈", color: "from-blue-400 via-purple-400 to-pink-400" },
  { id: "6", name: "Granizado Cola", price: 3.5, category: "Clásicos", emoji: "🥤", color: "from-amber-700 to-amber-900" },
];