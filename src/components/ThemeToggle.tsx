import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="h-9 w-9 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 transition-all duration-300 rounded-xl"
    >
      {theme === "dark" ? (
        <Sun className="h-5 w-5 transition-all duration-300 group-hover:scale-110" />
      ) : (
        <Moon className="h-5 w-5 transition-all duration-300 group-hover:scale-110" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}