import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera, Loader2, ArrowRight, ChevronLeft, Upload, Link as LinkIcon, X } from "lucide-react";
import { useOnboardingStore } from "@/store/onboarding";
import { useBlossom } from "@/hooks/useBlossom";
import { useUIStore } from "@/store/ui";
import { Avatar } from "@/components/common/Avatar";
import { useAuthStore } from "@/store/auth";

export function ProfileImageStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const { data, updateData } = useOnboardingStore();
  const { uploadFile } = useBlossom();
  const { addToast } = useUIStore();
  const { publicKey } = useAuthStore();
  const [isUploading, setIsUploading] = useState(false);
  const [useUrl, setUseUrl] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const result = await uploadFile(file);
      if (result && result.url) {
        updateData({ picture: result.url });
        addToast("Image uploaded!", "success");
      }
    } catch (err) {
      console.error(err);
      addToast("Upload failed.", "error");
    } finally {
      setIsUploading(false);
    }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInput.trim()) {
      updateData({ picture: urlInput.trim() });
      setUseUrl(false);
    }
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-right duration-500">
      <div className="space-y-2 text-center">
        <div className="inline-flex items-center justify-center size-16 bg-primary/10 text-primary rounded-2xl mb-2">
          <Camera size={32} />
        </div>
        <h2 className="text-3xl font-black tracking-tight">Add a profile image</h2>
        <p className="text-muted-foreground font-medium">People like to see who they are talking to!</p>
      </div>

      <div className="flex flex-col items-center justify-center space-y-6">
        <div className="relative group">
          <div className="size-40 rounded-full border-4 border-muted overflow-hidden relative shadow-2xl transition-transform group-hover:scale-105 duration-300 bg-muted/50 flex items-center justify-center">
            {data.picture ? (
              <Avatar 
                pubkey={publicKey || ''} 
                src={data.picture} 
                size={160} 
                className="size-full border-none rounded-none" 
              />
            ) : (
              <Avatar pubkey={publicKey || ''} size={160} className="border-none" />
            )}
            {isUploading && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <Loader2 className="animate-spin text-white size-8" />
              </div>
            )}
          </div>
          
          {data.picture && (
            <Button 
              size="icon" 
              variant="destructive" 
              className="absolute -top-2 -right-2 rounded-full size-8"
              onClick={() => updateData({ picture: '' })}
            >
              <X size={14} />
            </Button>
          )}
        </div>

        {!useUrl ? (
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleFileChange} 
            />
            <Button 
              onClick={() => fileInputRef.current?.click()} 
              disabled={isUploading}
              className="flex-1 h-12 rounded-2xl font-black gap-2"
            >
              <Upload size={18} />
              Upload Photo
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setUseUrl(true)}
              className="flex-1 h-12 rounded-2xl font-black gap-2"
            >
              <LinkIcon size={18} />
              Image URL
            </Button>
          </div>
        ) : (
          <form onSubmit={handleUrlSubmit} className="flex gap-2 w-full max-w-sm animate-in fade-in duration-300">
            <Input 
              placeholder="https://..." 
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="h-12 rounded-xl flex-1 border-2"
              autoFocus
            />
            <Button type="submit" className="h-12 rounded-xl px-4 font-black">Add</Button>
            <Button variant="ghost" size="icon" className="h-12 w-12 rounded-xl" onClick={() => setUseUrl(false)}>
              <X size={18} />
            </Button>
          </form>
        )}
      </div>

      <div className="flex items-center justify-between pt-8">
        <Button variant="ghost" onClick={onBack} className="rounded-xl h-12 font-bold gap-2 text-muted-foreground">
          <ChevronLeft size={20} />
          Back
        </Button>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={onNext} className="rounded-xl h-12 font-bold px-6">
            Skip
          </Button>
          <Button 
            onClick={onNext} 
            disabled={isUploading}
            className="rounded-2xl h-12 px-8 font-black gap-2 shadow-lg shadow-primary/20"
          >
            Continue
            <ArrowRight size={18} />
          </Button>
        </div>
      </div>
    </div>
  );
}
