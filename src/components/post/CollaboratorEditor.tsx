"use client";

import React, { useState } from "react";
import { Trash2, X, Users } from "lucide-react";
import { ZapSplit } from "@/lib/actions/post";
import { nip19 } from "@nostr-dev-kit/ndk";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

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
    } catch {
      alert("Invalid format");
    }
  };

  const removeCollaborator = (pubkey: string) => {
    setSplits(splits.filter(s => s.pubkey !== pubkey));
  };

  return (
    <div className="mt-3 p-4 bg-muted/30 border border-border rounded-2xl space-y-4 animate-in slide-in-from-top-2 duration-200">
      <div className="flex justify-between items-center px-1">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-purple-500" aria-hidden="true" />
          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Zap Splits (Collaborators)</Label>
        </div>
        <Button 
          variant="ghost" 
          size="icon-xs"
          onClick={onClose}
          className="text-muted-foreground hover:text-destructive h-6 w-6"
          aria-label="Remove collaborator editor"
        >
          <X className="size-3.5" />
        </Button>
      </div>

      {splits.length > 0 && (
        <div className="space-y-2">
          {splits.map((split) => (
            <div key={split.pubkey} className="flex items-center justify-between bg-background p-3 rounded-xl border border-border shadow-sm group">
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-mono truncate text-muted-foreground mb-0.5">
                  {split.pubkey.slice(0, 12)}…{split.pubkey.slice(-8)}
                </div>
                <div className="text-xs font-black uppercase tracking-tight text-primary">
                  {split.weight}% share
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => removeCollaborator(split.pubkey)}
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                aria-label="Remove collaborator"
              >
                <Trash2 size={16} aria-hidden="true" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-4 pt-2">
        <div className="space-y-2">
          <Input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="npub or hex pubkey"
            className="h-11 rounded-xl bg-background border-none shadow-sm focus-visible:ring-primary/20 text-sm font-medium"
          />
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Share Weight</Label>
            <span className="text-xs font-black tabular-nums text-primary">{weightVal}%</span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex-1 px-1">
              <Slider
                min={1}
                max={100}
                step={1}
                value={[weightVal]}
                onValueChange={(vals) => setWeightVal(vals[0])}
                className="py-4"
              />
            </div>
            <Button
              onClick={addCollaborator}
              disabled={!inputVal.trim()}
              size="sm"
              className="h-10 px-6 rounded-xl font-black shadow-lg shadow-primary/20 shrink-0"
            >
              Add
            </Button>
          </div>
        </div>
      </div>

      <p className="px-1 text-[10px] text-muted-foreground leading-relaxed font-medium italic opacity-70">
        Zaps sent to this post will be automatically split between you and the collaborators.
      </p>
    </div>
  );
};
