"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { X, Download, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

interface LightboxMedia {
  url: string;
  type: "image" | "video";
  alt?: string;
}

interface LightboxProps {
  media: LightboxMedia[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  postHref?: string;
}

export const Lightbox: React.FC<LightboxProps> = ({ 
  media, 
  initialIndex = 0, 
  isOpen, 
  onClose, 
  postHref 
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [direction, setDirection] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
    }
  }, [isOpen, initialIndex]);

  const goToNext = useCallback(() => {
    if (currentIndex < media.length - 1) {
      setDirection(1);
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentIndex, media.length]);

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      setDirection(-1);
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "ArrowRight") goToNext();
      if (e.key === "ArrowLeft") goToPrevious();
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, goToNext, goToPrevious, onClose]);

  const currentMedia = media[currentIndex];
  if (!currentMedia && media.length > 0) return null;

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const link = document.createElement("a");
    link.href = currentMedia.url;
    link.download = currentMedia.alt || "media";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenOriginal = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(currentMedia.url, "_blank");
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
      scale: 0.9,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 300 : -300,
      opacity: 0,
      scale: 0.9,
    }),
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[100vw] w-screen h-screen p-0 border-none bg-black/95 shadow-2xl flex flex-col items-center justify-center overflow-hidden gap-0 sm:rounded-none">
        <DialogTitle className="sr-only">Media Preview</DialogTitle>
        <DialogDescription className="sr-only">
          {currentMedia?.alt || "Full screen media preview"}
        </DialogDescription>
        
        {/* Controls Overlay */}
        <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-4 bg-linear-to-b from-black/60 to-transparent pointer-events-none">
          <div className="flex items-center gap-2 pointer-events-auto">
            {media.length > 1 && (
              <span className="text-white/80 text-xs font-black bg-black/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                {currentIndex + 1} / {media.length}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2 pointer-events-auto">
            {postHref && (
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20 rounded-full bg-black/20 backdrop-blur-sm px-4 gap-2 h-10 hidden sm:flex"
              >
                <a href={postHref}>
                  <ExternalLink className="size-4" />
                  <span className="font-bold">View Post</span>
                </a>
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDownload}
              className="text-white hover:bg-white/20 rounded-full bg-black/20 backdrop-blur-sm h-10 w-10"
              title="Download"
            >
              <Download className="size-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleOpenOriginal}
              className="text-white hover:bg-white/20 rounded-full bg-black/20 backdrop-blur-sm h-10 w-10"
              title="Open Original"
            >
              <ExternalLink className="size-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-full bg-black/20 backdrop-blur-sm h-10 w-10"
              title="Close"
            >
              <X className="size-5" />
            </Button>
          </div>
        </div>

        {/* Navigation Buttons */}
        {media.length > 1 && (
          <>
            <div className="absolute left-4 top-1/2 -translate-y-1/2 z-50 hidden sm:block">
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => { e.stopPropagation(); goToPrevious(); }}
                disabled={currentIndex === 0}
                className="text-white hover:bg-white/20 rounded-full bg-black/20 backdrop-blur-md h-14 w-14 disabled:opacity-30"
              >
                <ChevronLeft className="size-8" />
              </Button>
            </div>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 z-50 hidden sm:block">
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => { e.stopPropagation(); goToNext(); }}
                disabled={currentIndex === media.length - 1}
                className="text-white hover:bg-white/20 rounded-full bg-black/20 backdrop-blur-md h-14 w-14 disabled:opacity-30"
              >
                <ChevronRight className="size-8" />
              </Button>
            </div>
          </>
        )}

        <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
          <AnimatePresence initial={false} custom={direction} mode="wait">
            <motion.div
              key={currentIndex}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 },
                scale: { duration: 0.2 }
              }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={1}
              onDragEnd={(_, info) => {
                if (info.offset.x < -100) goToNext();
                else if (info.offset.x > 100) goToPrevious();
              }}
              className="absolute inset-0 flex items-center justify-center p-2 sm:p-12 cursor-grab active:cursor-grabbing"
              onClick={onClose}
            >
              {currentMedia?.type === "image" ? (
                <div className="relative w-full h-full" onClick={(e) => e.stopPropagation()}>
                  <Image
                    src={currentMedia.url}
                    alt={currentMedia.alt || ""}
                    fill
                    sizes="100vw"
                    className="object-contain select-none shadow-2xl"
                    priority
                  />
                </div>
              ) : (
                <video
                  src={currentMedia?.url}
                  controls
                  autoPlay
                  className="max-w-full max-h-full object-contain shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
        
        {currentMedia?.alt && (
          <div className="absolute bottom-20 sm:bottom-10 left-1/2 -translate-x-1/2 z-50 bg-black/60 backdrop-blur-md px-6 py-2.5 rounded-full border border-white/10 text-white text-sm font-bold max-w-[80vw] truncate">
            {currentMedia.alt}
          </div>
        )}

        {/* Mobile Swipe Indicator */}
        {media.length > 1 && (
          <div className="sm:hidden absolute bottom-6 left-1/2 -translate-x-1/2 z-50 flex gap-1.5">
            {media.map((_, i) => (
              <div 
                key={i} 
                className={`h-1.5 rounded-full transition-all duration-300 ${i === currentIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/30'}`}
              />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

