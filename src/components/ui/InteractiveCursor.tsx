import React, { useEffect, useState, useRef } from "react";
import { motion, useSpring, useMotionValue } from "framer-motion";

export const InteractiveCursor: React.FC = () => {
  const [isPointer, setIsPointer] = useState(false);
  const isPointerRef = useRef(false);
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);

  const springConfig = { damping: 25, stiffness: 700 };
  const cursorXSpring = useSpring(cursorX, springConfig);
  const cursorYSpring = useSpring(cursorY, springConfig);

  useEffect(() => {
    const moveCursor = (e: MouseEvent) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);

      const target = e.target as HTMLElement;
      if (!target) return;

      const isClickable = !!(
        target.closest('button') || 
        target.closest('a') || 
        target.closest('.cursor-pointer') ||
        target.tagName === 'INPUT' ||
        target.tagName === 'SELECT'
      );
      
      if (isPointerRef.current !== isClickable) {
        isPointerRef.current = isClickable;
        setIsPointer(isClickable);
      }
    };

    window.addEventListener("mousemove", moveCursor);
    return () => window.removeEventListener("mousemove", moveCursor);
  }, [cursorX, cursorY]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] hidden md:block">
      <motion.div
        className="fixed top-0 left-0 w-8 h-8 rounded-full border-2 border-primary mix-blend-difference flex items-center justify-center"
        style={{
          translateX: cursorXSpring,
          translateY: cursorYSpring,
        }}
        animate={{
          width: isPointer ? 80 : 32,
          height: isPointer ? 80 : 32,
          x: isPointer ? -40 : -16,
          y: isPointer ? -40 : -16,
          backgroundColor: isPointer ? "rgba(112, 13, 231, 0.2)" : "rgba(112, 13, 231, 0)",
          borderWidth: isPointer ? 1 : 2,
        }}
        transition={{ type: "spring", stiffness: 250, damping: 20 }}
      >
        <motion.div 
          className="w-1.5 h-1.5 bg-primary rounded-full shadow-glow-pro"
          animate={{
            scale: isPointer ? 0.5 : 1,
          }}
        />
      </motion.div>
    </div>
  );
};
