import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FavoritesState {
  favorites: string[];
  addFavorite: (href: string) => void;
  removeFavorite: (href: string) => void;
  toggleFavorite: (href: string) => void;
  isFavorite: (href: string) => boolean;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favorites: [],
      addFavorite: (href: string) => 
        set((state) => ({
          favorites: state.favorites.includes(href) 
            ? state.favorites 
            : [...state.favorites, href]
        })),
      removeFavorite: (href: string) =>
        set((state) => ({
          favorites: state.favorites.filter((f) => f !== href)
        })),
      toggleFavorite: (href: string) =>
        set((state) => {
          if (state.favorites.includes(href)) {
            return { favorites: state.favorites.filter((f) => f !== href) };
          }
          return { favorites: [...state.favorites, href] };
        }),
      isFavorite: (href: string) => get().favorites.includes(href),
    }),
    {
      name: 'pekao-favorites-storage', // name of item in the storage (must be unique)
    }
  )
);
