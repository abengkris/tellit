"use client";

import React, { useState, useRef, useEffect } from "react";

interface DropdownItem {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  variant?: "default" | "danger";
  description?: string;
}

interface DropdownMenuProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  align?: "left" | "right";
  position?: "up" | "down";
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({ 
  trigger, 
  items, 
  align = "right",
  position = "down"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const positionClasses = position === "up" 
    ? "bottom-full mb-2 origin-bottom" 
    : "top-full mt-2 origin-top";

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <div onClick={(e) => {
        e.stopPropagation();
        setIsOpen(!isOpen);
      }}>
        {trigger}
      </div>

      {isOpen && (
        <div 
          className={`absolute ${align === "right" ? "right-0" : "left-0"} ${positionClasses} w-56 rounded-xl bg-white dark:bg-gray-900 shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none z-50 overflow-hidden border border-gray-100 dark:border-gray-800 animate-in fade-in zoom-in-95 duration-100`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="py-1">
            {items.map((item, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  item.onClick();
                  setIsOpen(false);
                }}
                className={`flex items-center w-full px-4 py-3 text-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
                  item.variant === "danger" 
                    ? "text-red-600 dark:text-red-400" 
                    : "text-gray-700 dark:text-gray-300"
                }`}
              >
                {item.icon && <span className="mr-3 shrink-0">{item.icon}</span>}
                <div className="flex flex-col items-start min-w-0">
                  <span className="font-bold">{item.label}</span>
                  {item.description && (
                    <span className="text-[10px] text-gray-500 font-medium">{item.description}</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
