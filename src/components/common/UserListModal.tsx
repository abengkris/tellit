"use client";

import React from "react";
import { X } from "lucide-react";
import { FollowList } from "../profile/FollowList";

interface UserListModalProps {
  isOpen: boolean;
  onClose: () => void;
  pubkeys: string[];
  title: string;
  loading?: boolean;
}

export const UserListModal: React.FC<UserListModalProps> = ({ 
  isOpen, 
  onClose, 
  pubkeys, 
  title,
  loading = false
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-950 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 h-[70vh] flex flex-col">
        <div className="p-4 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center shrink-0">
          <h3 className="font-black text-xl">{title}</h3>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-900 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <FollowList 
            pubkeys={pubkeys} 
            loading={loading}
            emptyMessage="No users found."
          />
        </div>
      </div>
    </div>
  );
};
