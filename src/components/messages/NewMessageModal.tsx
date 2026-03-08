"use client";

import React, { useState } from "react";
import { X, Search, Loader2 } from "lucide-react";
import { useSearch } from "@/hooks/useSearch";
import { Avatar } from "../common/Avatar";
import { useRouter } from "next/navigation";
import { toNpub } from "@/lib/utils/nip19";

interface NewMessageModalProps {
  onClose: () => void;
}

export const NewMessageModal: React.FC<NewMessageModalProps> = ({ onClose }) => {
  const [query, setQuery] = useState("");
  const { profiles, loading } = useSearch(query);
  const router = useRouter();

  const handleSelectUser = (pubkey: string) => {
    const npub = toNpub(pubkey);
    router.push(`/messages/${npub}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-950 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 h-[80vh] flex flex-col">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
          <h3 className="font-black text-xl">New message</h3>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 border-b border-gray-100 dark:border-gray-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              autoFocus
              placeholder="Search people..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-100 dark:bg-gray-900 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && query.length >= 3 ? (
            <div className="flex justify-center py-10">
              <Loader2 className="animate-spin text-blue-500" size={32} />
            </div>
          ) : profiles.length > 0 ? (
            <div className="divide-y divide-gray-50 dark:divide-gray-900">
              {profiles.map((user) => (
                <button
                  key={user.pubkey}
                  onClick={() => handleSelectUser(user.pubkey)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors text-left"
                >
                  <Avatar pubkey={user.pubkey} src={user.profile?.image} size={44} />
                  <div className="min-w-0 flex-1">
                    <div className="font-bold truncate text-gray-900 dark:text-white">
                      {user.profile?.display_name || user.profile?.name || "Unknown"}
                    </div>
                    {user.profile?.nip05 && (
                      <div className="text-xs text-blue-500 truncate">{user.profile.nip05}</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : query.length >= 3 ? (
            <div className="text-center py-10 text-gray-500">
              No results found for &quot;{query}&quot;
            </div>
          ) : (
            <div className="text-center py-10 text-gray-500 px-6">
              <p className="text-sm font-medium">Search for people by name, npub, or NIP-05 to start a new private conversation.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
