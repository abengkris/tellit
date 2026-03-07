"use client";

import React, { useState } from "react";
import { Plus, Trash2, X, Users } from "lucide-react";
import { ZapSplit } from "@/lib/actions/post";
import { nip19 } from "nostr-tools";

interface CollaboratorEditorProps {
  splits: ZapSplit[];
  setSplits: (splits: ZapSplit[]) => void;
  onClose: () => void;
}

export const CollaboratorEditor: React.FC<CollaboratorEditorProps> = ({ splits, setSplits, onClose }) => {
  const [inputVal, setInputVal] = useState("");
  const [weightVal, setWeightVal] = useState(50);

  const addCollaborator = () => {
    try {
      let pubkey = inputVal.trim();
      if (pubkey.startsWith("npub")) {
        const decoded = nip19.decode(pubkey);
        pubkey = decoded.data as string;
      }

      if (!/^[0-9a-fA-F]{64}$/.test(pubkey)) {
        alert("Invalid pubkey or npub");
        return;
      }

      if (splits.some(s => s.pubkey === pubkey)) {
        alert("Collaborator already added");
        return;
      }

      setSplits([...splits, { pubkey, weight: weightVal }]);
      setInputVal("");
    } catch (e) {
      alert("Invalid format");
    }
  };

  const removeCollaborator = (pubkey: string) => {
    setSplits(splits.filter(s => s.pubkey !== pubkey));
  };

  return (
    <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 animate-in slide-in-from-top-2">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-purple-500" />
          <span className="text-xs font-black uppercase tracking-widest text-gray-500">Zap Splits (Collaborators)</span>
        </div>
        <button 
          onClick={onClose}
          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-500"
        >
          <X size={16} />
        </button>
      </div>

      {splits.length > 0 && (
        <div className="space-y-2 mb-4">
          {splits.map((split) => (
            <div key={split.pubkey} className="flex items-center justify-between bg-white dark:bg-black p-3 rounded-xl border border-gray-100 dark:border-gray-800">
              <div className="min-w-0 flex-1">
                <div className="text-xs font-mono truncate text-gray-500">
                  {split.pubkey.slice(0, 8)}...{split.pubkey.slice(-8)}
                </div>
                <div className="text-xs font-bold">{split.weight}% share</div>
              </div>
              <button
                onClick={() => removeCollaborator(split.pubkey)}
                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder="npub or hex pubkey"
          className="w-full bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label className="text-[10px] uppercase font-bold text-gray-400 mb-1 block">Share Percentage</label>
            <input
              type="range"
              min="1"
              max="100"
              value={weightVal}
              onChange={(e) => setWeightVal(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>
          <div className="w-12 text-center font-bold text-sm">{weightVal}%</div>
          <button
            onClick={addCollaborator}
            disabled={!inputVal.trim()}
            className="px-4 py-2 bg-blue-500 text-white text-sm font-bold rounded-xl disabled:opacity-50 hover:bg-blue-600 transition-colors"
          >
            Add
          </button>
        </div>
      </div>

      <p className="mt-3 text-[10px] text-gray-400 leading-tight">
        Zaps sent to this post will be automatically split between you and the collaborators. Note: Total percentage can exceed 100% (weights are relative).
      </p>
    </div>
  );
};
