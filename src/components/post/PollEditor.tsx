"use client";

import React from "react";
import { Plus, Trash2, X } from "lucide-react";
import { PollOption } from "@/lib/actions/poll";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PollEditorProps {
  options: PollOption[];
  setOptions: (options: PollOption[]) => void;
  onClose: () => void;
}

export const PollEditor: React.FC<PollEditorProps> = ({ options, setOptions, onClose }) => {
  const addOption = () => {
    if (options.length >= 10) return;
    setOptions([...options, { id: options.length.toString(), label: "" }]);
  };

  const removeOption = (id: string) => {
    if (options.length <= 2) return;
    setOptions(options.filter((o) => o.id !== id));
  };

  const updateOption = (id: string, label: string) => {
    setOptions(options.map((o) => (o.id === id ? { ...o, label } : o)));
  };

  return (
    <div className="bg-muted/30 border border-border rounded-2xl p-4 space-y-4">
      <div className="flex items-center justify-between px-1">
        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Poll Options</Label>
        <Button 
          variant="ghost" 
          size="icon-xs" 
          onClick={onClose}
          className="text-muted-foreground hover:text-destructive h-6 w-6"
          aria-label="Remove poll"
        >
          <X className="size-3.5" />
        </Button>
      </div>

      <div className="space-y-2">
        {options.map((opt, index) => (
          <div key={opt.id} className="flex items-center gap-2">
            <Input
              value={opt.label}
              onChange={(e) => updateOption(opt.id, e.target.value)}
              placeholder={`Option ${index + 1}`}
              className="h-11 rounded-xl bg-background border-none shadow-sm focus-visible:ring-primary/20 font-medium"
            />
            {options.length > 2 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeOption(opt.id)}
                className="text-muted-foreground hover:text-destructive shrink-0 rounded-xl"
                aria-label={`Remove option ${index + 1}`}
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {options.length < 10 && (
        <Button
          variant="ghost"
          onClick={addOption}
          className="w-full h-11 rounded-xl border border-dashed border-border text-primary hover:bg-primary/5 hover:border-primary/30 font-bold gap-2"
        >
          <Plus className="size-4" aria-hidden="true" />
          <span>Add option</span>
        </Button>
      )}
      
      <p className="text-[10px] text-muted-foreground text-center font-medium">
        Polls currently run for 24 hours.
      </p>
    </div>
  );
};
