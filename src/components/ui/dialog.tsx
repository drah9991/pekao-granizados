/* eslint-disable react-refresh/only-export-components */
import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DialogContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
  dialogRef: React.RefObject<HTMLDialogElement>;
  dialogElement: HTMLDialogElement | null;
}

export const DialogContext = React.createContext<DialogContextType | null>(null);

interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

const Dialog = ({
  open: controlledOpen,
  onOpenChange: controlledSetOpen,
  children
}: DialogProps) => {
  const [localOpen, localSetOpen] = React.useState(false);

  const open = controlledOpen !== undefined ? controlledOpen : localOpen;
  const setOpen = React.useCallback((val: boolean) => {
    if (controlledSetOpen) {
      controlledSetOpen(val);
    } else {
      localSetOpen(val);
    }
  }, [controlledSetOpen]);

  const dialogRef = React.useRef<HTMLDialogElement>(null);
  const [dialogElement, setDialogElement] = React.useState<HTMLDialogElement | null>(null);

  const setRef = React.useCallback((node: HTMLDialogElement | null) => {
    (dialogRef as React.MutableRefObject<HTMLDialogElement | null>).current = node;
    setDialogElement(node);
  }, []);

  React.useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [open]);

  React.useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      if (open) {
        setOpen(false);
      }
    };

    dialog.addEventListener("close", handleClose);
    return () => {
      dialog.removeEventListener("close", handleClose);
    };
  }, [open, setOpen]);

  // Prevent default cancel to let escape sync via our native 'close' event
  const handleCancel = (e: React.SyntheticEvent) => {
    e.preventDefault();
    setOpen(false);
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === e.currentTarget) {
      const dialog = dialogRef.current;
      if (!dialog) return;
      const rect = dialog.getBoundingClientRect();
      const isClickInside = (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      );
      if (!isClickInside) {
        setOpen(false);
      }
    }
  };
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <DialogContext.Provider value={{ open, setOpen, dialogRef, dialogElement }}>
      <dialog
        ref={setRef}
        onCancel={handleCancel}
        onClick={handleBackdropClick}
        className="dialog-native-reset p-0 bg-transparent border-0 outline-none backdrop:bg-black/80"
        style={{ margin: "auto" }}
      >
        {open ? children : null}
      </dialog>
    </DialogContext.Provider>
  );
};
interface DialogTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
}

const DialogTrigger = ({ children, asChild }: DialogTriggerProps) => {
  const context = React.useContext(DialogContext);
  if (!context) throw new Error("DialogTrigger must be used within Dialog");

  const handleClick = (e: React.MouseEvent) => {
    context.setOpen(true);
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
      onClick: (e: React.MouseEvent) => {
        if (children.props.onClick) children.props.onClick(e);
        handleClick(e);
      }
    });
  }

  return (
    <button onClick={handleClick} type="button">
      {children}
    </button>
  );
};

const DialogPortal = ({ children }: { children: React.ReactNode }) => <>{children}</>;

const DialogOverlay = () => null;

interface DialogCloseProps {
  children: React.ReactNode;
  asChild?: boolean;
}

const DialogClose = ({ children, asChild }: DialogCloseProps) => {
  const context = React.useContext(DialogContext);
  if (!context) throw new Error("DialogClose must be used within Dialog");

  const handleClick = (e: React.MouseEvent) => {
    context.setOpen(false);
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
      onClick: (e: React.MouseEvent) => {
        if (children.props.onClick) children.props.onClick(e);
        handleClick(e);
      }
    });
  }

  return (
    <button onClick={handleClick} type="button">
      {children}
    </button>
  );
};

const DialogContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const context = React.useContext(DialogContext);
  if (!context) throw new Error("DialogContent must be used within Dialog");

  return (
    <div
      ref={ref}
      className={cn(
        "relative grid w-[calc(100%-2rem)] sm:w-full max-w-lg h-fit max-h-[90dvh] gap-4 border bg-background p-6 shadow-lg sm:rounded-lg overflow-y-auto custom-scrollbar pointer-events-auto",
        className,
      )}
      {...props}
    >
      {children}
      <button
        onClick={() => context.setOpen(false)}
        className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
      >
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </button>
    </div>
  );
});
DialogContent.displayName = "DialogContent";

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
DialogTitle.displayName = "DialogTitle";

const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
DialogDescription.displayName = "DialogDescription";

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
export type { DialogProps };
