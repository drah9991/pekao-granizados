# Design Philosophy - Pekao Granizados

## The "Deep Space" Aesthetic

The Pekao Granizados POS system breaks away from traditional, bright, and often cluttered point-of-sale interfaces. We have adopted a "Deep Space" aesthetic characterized by:

*   **Dark Mode Native:** A predominantly dark interface (`zinc-950` backgrounds) reduces eye strain for employees working long shifts in varied lighting conditions.
*   **Vibrant Accents:** Neon-like accents (electric blues, vibrant purples) guide the user's eye to primary actions (checkout, alerts, critical metrics).
*   **Glassmorphism:** Subtle use of transparency and blur (`backdrop-blur`) creates a sense of depth and modernity without sacrificing readability.

**Why this approach?**
A POS system shouldn't just be functional; it should feel premium. A high-end interface instills confidence in the staff using it and projects a modern, tech-forward image to customers who might catch a glimpse of the screen.

## The "Zero-Friction" UX Ideology

### 1. The Cashier First
The primary user is the cashier. Every interaction is designed to minimize clicks.
*   **Large Touch Targets:** Buttons and product cards are generously sized to prevent mis-clicks during rush hours.
*   **Immediate Visual Feedback:** Every action (adding to cart, successful sale, error) provides instant visual and haptic-like (animations) feedback.

### 2. Trust the Math, Expose the Data
Inventory management in food service is notoriously difficult due to the "mixture problem" (bulk ingredients sold in varying sizes).
*   Our philosophy is to automate the complex math (Oz to Ml conversion, recipe deduction) in the backend (Postgres RPC) to ensure perfect atomic consistency.
*   The frontend's job is simply to present this complex data in an easy-to-understand visual format (e.g., Progress bars for mixture tanks).

### 3. Resilience over Perfection
In a physical store, the internet can go down, but sales cannot stop.
*   The Offline-First architecture ensures that the system fails gracefully. The UX explicitly informs the user that they are offline but assures them that sales are safely queued.

## Code as Craft
We treat the codebase with the same respect as the UI. 
*   **Modular Architecture:** Strict separation of concerns (Hooks for logic, UI components for rendering).
*   **Typescript Driven:** Heavy reliance on static typing to prevent runtime errors in critical financial and inventory calculations.
