"use client";

import React, { useEffect, useState } from "react";
import { ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function BackToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 1000) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", toggleVisibility, { passive: true });
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <Button
      variant="secondary"
      size="icon"
      className={cn(
        "fixed bottom-20 right-6 z-50 rounded-full shadow-lg transition-all duration-300 transform scale-0",
        isVisible && "scale-100 opacity-100",
        !isVisible && "pointer-events-none opacity-0"
      )}
      onClick={scrollToTop}
      aria-label="Back to top"
    >
      <ChevronUp size={20} />
    </Button>
  );
}
