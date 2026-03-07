"use client";

import React, { useEffect } from "react";
import { useUIStore, Toast } from "@/store/ui";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const ToastContainer = () => {
  const { toasts } = useUIStore();

  return (
    <div className="fixed bottom-24 sm:bottom-8 right-4 left-4 sm:left-auto sm:right-8 z-[100] flex flex-col items-end space-y-3 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </AnimatePresence>
    </div>
  );
};

const ToastItem = ({ toast }: { toast: Toast }) => {
  const { removeToast } = useUIStore();

  useEffect(() => {
    if (toast.duration !== Infinity) {
      const timer = setTimeout(() => {
        removeToast(toast.id);
      }, toast.duration || 4000);
      return () => clearTimeout(timer);
    }
  }, [toast, removeToast]);

  const variants = {
    initial: { opacity: 0, y: 20, scale: 0.9, x: 20 },
    animate: { opacity: 1, y: 0, scale: 1, x: 0 },
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
  };

  const getIcon = () => {
    switch (toast.type) {
      case "success": return <CheckCircle2 className="text-green-500" size={20} />;
      case "error": return <AlertCircle className="text-red-500" size={20} />;
      default: return <Info className="text-blue-500" size={20} />;
    }
  };

  const getStyles = () => {
    switch (toast.type) {
      case "success": return "border-green-500/20 bg-green-50/90 dark:bg-green-950/40";
      case "error": return "border-red-500/20 bg-red-50/90 dark:bg-red-950/40";
      default: return "border-blue-500/20 bg-blue-50/90 dark:bg-blue-950/40";
    }
  };

  return (
    <motion.div
      layout
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={`pointer-events-auto flex flex-col min-w-[300px] max-w-md overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-md ${getStyles()}`}
    >
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center space-x-3">
          <div className="shrink-0">{getIcon()}</div>
          <p className="text-sm font-bold leading-tight text-gray-900 dark:text-white">
            {toast.message}
          </p>
        </div>
        
        <div className="flex items-center ml-4 space-x-2">
          {toast.action && (
            <button
              onClick={() => {
                toast.action?.onClick();
                removeToast(toast.id);
              }}
              className="px-3 py-1.5 text-xs font-black uppercase tracking-widest bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 rounded-lg transition-colors"
            >
              {toast.action.label}
            </button>
          )}
          
          <button
            onClick={() => removeToast(toast.id)}
            className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors text-gray-400"
          >
            <X size={16} />
          </button>
        </div>
      </div>
      
      {/* Progress bar for auto-dismiss */}
      {toast.duration !== Infinity && (
        <motion.div
          initial={{ scaleX: 1 }}
          animate={{ scaleX: 0 }}
          transition={{ duration: (toast.duration || 4000) / 1000, ease: "linear" }}
          className={`h-1 w-full origin-left ${
            toast.type === "success" ? "bg-green-500/30" : 
            toast.type === "error" ? "bg-red-500/30" : "bg-blue-500/30"
          }`}
        />
      )}
    </motion.div>
  );
};
