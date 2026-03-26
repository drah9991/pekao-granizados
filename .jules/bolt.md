## 2024-03-24 - React Memo Optimization
**Learning:** Found an opportunity to optimize performance by memoizing large UI components that re-render frequently (e.g., `ProductGrid`) inside `src/pages/POS.tsx`. Since `POS.tsx` manages state like `cart` and updates it frequently, components like `ProductGrid` which only rely on `onProductSelect`, `searchRef`, and `activeCategoryIndex` shouldn't re-render every time the cart updates. By using `React.memo` on `ProductGrid`, we can prevent unnecessary re-renders of the product list.

**Action:** Wrap `ProductGrid` with `React.memo`. Additionally, wrap `handleProductSelect` with `useCallback` in `POS.tsx`.
