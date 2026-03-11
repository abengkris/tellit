"use client";

import React from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { X, Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LightboxProps {
  src: string;
  alt?: string;
  isOpen: boolean;
  onClose: () => void;
  postHref?: string;
}

export const Lightbox: React.FC<LightboxProps> = ({ src, alt, isOpen, onClose, postHref }) => {
  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Simple download logic
    const link = document.createElement("a");
    link.href = src;
    link.download = alt || "image";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenOriginal = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(src, "_blank");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 border-none bg-black/90 shadow-2xl flex flex-col items-center justify-center overflow-hidden gap-0 sm:rounded-3xl">
        <DialogTitle className="sr-only">Image Preview</DialogTitle>
        <DialogDescription className="sr-only">
          {alt || "Full screen image preview"}
        </DialogDescription>
        
        {/* Controls Overlay */}
        <div className="absolute top-4 right-4 z-50 flex items-center gap-2 animate-in fade-in duration-500">
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
            className="text-white hover:bg-white/20 rounded-full bg-black/20 backdrop-blur-sm"
            title="Download"
          >
            <Download className="size-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleOpenOriginal}
            className="text-white hover:bg-white/20 rounded-full bg-black/20 backdrop-blur-sm"
            title="Open Original"
          >
            <ExternalLink className="size-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full bg-black/20 backdrop-blur-sm"
            title="Close"
          >
            <X className="size-5" />
          </Button>
        </div>

        <div className="relative w-full h-full flex items-center justify-center p-2 sm:p-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt || ""}
            className="max-w-full max-h-[90vh] object-contain select-none animate-in zoom-in-95 duration-300 shadow-2xl rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
        
        {alt && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-white text-xs font-medium max-w-[80vw] truncate animate-in slide-in-from-bottom-4 duration-500">
            {alt}
          </div>
        )}

        {/* Mobile View Post Link */}
        {postHref && (
          <div className="sm:hidden absolute bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90%]">
            <Button asChild className="w-full rounded-2xl h-12 font-black shadow-xl" variant="default">
              <a href={postHref}>View Original Post</a>
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
