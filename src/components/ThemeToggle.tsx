import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Moon, Sun, Loader2 } from "lucide-react";
import { useTransition } from "react";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [isPending, startTransition] = useTransition();

  const toggleTheme = () => {
    startTransition(() => {
      setTheme(theme === "dark" ? "light" : "dark");
    });
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      disabled={isPending}
      aria-label="Alternar modo de color oscuro"
      className="h-9 w-9 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 transition-all duration-300 rounded-xl"
    >
      {isPending ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : theme === "dark" ? (
        <Sun className="h-5 w-5 transition-all duration-300 group-hover:scale-110" />
      ) : (
        <Moon className="h-5 w-5 transition-all duration-300 group-hover:scale-110" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}