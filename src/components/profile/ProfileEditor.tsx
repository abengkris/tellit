"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Camera, Image as ImageIcon, Loader2, AlertCircle, Check, Upload, Tag, ShieldCheck, Trash2, Info } from "lucide-react";
import { ProfileMetadata } from "@/hooks/useProfile";
import { updateProfile } from "@/lib/actions/profile";
import { useNDK } from "@/hooks/useNDK";
import { useUIStore } from "@/store/ui";
import { useBlossom } from "@/hooks/useBlossom";
import { useLists } from "@/hooks/useLists";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ProfileEditorProps {
  currentProfile: ProfileMetadata | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const ProfileEditor: React.FC<ProfileEditorProps> = ({
  currentProfile,
  onSuccess,
  onCancel
}) => {
  const { ndk } = useNDK();
  const { addToast } = useUIStore();
  const { uploadFile } = useBlossom();
  
  const { 
    interests, addInterest, removeInterest,
    externalIdentities, addExternalIdentity, removeExternalIdentity 
  } = useLists();
  
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [interestInput, setInterestInput] = useState("");
  const [idInput, setIdInput] = useState({ platform: "github", identity: "", proof: "" });
  const [showIdHelp, setShowIdHelp] = useState(false);
  
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<ProfileMetadata>({
    name: "",
    display_name: "",
    about: "",
    picture: "",
    banner: "",
    website: "",
    nip05: "",
    lud16: "",
    pronouns: "",
  });

  const [validations, setValidations] = useState({
    website: true,
    nip05: true,
    lud16: true
  });

  useEffect(() => {
    if (currentProfile) {
      setFormData({
        name: currentProfile.name || "",
        display_name: currentProfile.display_name || "",
        about: currentProfile.about || "",
        picture: currentProfile.picture || "",
        banner: currentProfile.banner || "",
        website: currentProfile.website || "",
        nip05: currentProfile.nip05 || "",
        lud16: currentProfile.lud16 || "",
        pronouns: currentProfile.pronouns || "",
      });
    }
  }, [currentProfile]);

  // Simple validation logic
  useEffect(() => {
    const isWebsiteValid = !formData.website || /^https?:\/\/.+\..+/.test(formData.website);
    const isNip05Valid = !formData.nip05 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.nip05);
    const isLud16Valid = !formData.lud16 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.lud16);
    
    setValidations({
      website: isWebsiteValid,
      nip05: isNip05Valid,
      lud16: isLud16Valid
    });
  }, [formData.website, formData.nip05, formData.lud16]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'picture' | 'banner') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === 'picture') setUploadingAvatar(true);
    else setUploadingBanner(true);

    try {
      const result = await uploadFile(file);
      if (result && result.url) {
        setFormData(prev => ({ ...prev, [type]: result.url }));
        addToast(`${type === 'picture' ? 'Avatar' : 'Banner'} uploaded successfully!`, "success");
      }
    } catch (err) {
      console.error(err);
      addToast(`Failed to upload ${type}.`, "error");
    } finally {
      if (type === 'picture') setUploadingAvatar(false);
      else setUploadingBanner(false);
      // Reset input
      if (e.target) e.target.value = '';
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!ndk) return;

    setLoading(true);
    try {
      const profileSuccess = await updateProfile(ndk, formData);
      
      if (profileSuccess) {
        addToast("Profile updated successfully!", "success");
        onSuccess?.();
      } else {
        addToast("Failed to update profile. Please try again.", "error");
      }
    } catch (err) {
      console.error(err);
      addToast("An error occurred while updating profile.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const processedValue = name === "name" ? value.toLowerCase() : value;
    setFormData(prev => ({ ...prev, [name]: processedValue }));
  };

  return (
    <div className="flex flex-col w-full max-w-2xl mx-auto bg-background">
      <div className="flex flex-col">
        {/* Banner Preview */}
        <div className="relative h-32 sm:h-40 bg-muted group rounded-t-3xl overflow-hidden">
          {formData.banner ? (
            <Image src={formData.banner} alt="Banner preview" fill className="object-cover" unoptimized />
          ) : (
            <div className="w-full h-full bg-linear-to-r from-primary/20 to-purple-500/20" />
          )}
          <Button 
            variant="ghost"
            type="button"
            className="absolute inset-0 flex flex-col items-center justify-center bg-black/20 group-hover:bg-black/40 cursor-pointer transition-all gap-2 w-full h-full rounded-none"
            onClick={() => bannerInputRef.current?.click()}
            aria-label="Change Banner"
          >
            {uploadingBanner ? (
              <Loader2 className="text-white animate-spin size-8" aria-hidden="true" />
            ) : (
              <>
                <ImageIcon className="text-white drop-shadow-md size-8" aria-hidden="true" />
                <Badge variant="secondary" className="bg-black/40 text-white border-white/20 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity font-black uppercase tracking-widest text-[10px]">
                  Change Banner
                </Badge>
              </>
            )}
          </Button>
          <input 
            type="file" 
            ref={bannerInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={(e) => handleFileChange(e, 'banner')}
          />
        </div>

        <div className="px-6 pb-8 relative">
          {/* Avatar Preview */}
          <div className="relative -mt-10 sm:-mt-12 mb-6 inline-block group">
            <div className="size-20 sm:size-24 rounded-full border-4 border-background overflow-hidden bg-muted shadow-lg relative">
              <Image 
                src={formData.picture || `https://robohash.org/placeholder?set=set1`} 
                alt="Avatar preview" 
                fill
                className="object-cover"
                unoptimized
              />
              <Button 
                variant="ghost"
                type="button"
                className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/60 rounded-full cursor-pointer transition-all w-full h-full"
                onClick={() => avatarInputRef.current?.click()}
                aria-label="Change Avatar"
              >
                {uploadingAvatar ? (
                  <Loader2 className="text-white animate-spin size-6" aria-hidden="true" />
                ) : (
                  <Camera className="text-white size-6" aria-hidden="true" />
                )}
              </Button>
            </div>
            <input 
              type="file" 
              ref={avatarInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={(e) => handleFileChange(e, 'picture')}
            />
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4 p-4 bg-muted/30 rounded-2xl border border-border">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Avatar URL</Label>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="h-auto p-0 text-[10px] font-black text-primary hover:bg-transparent"
                  >
                    <Upload className="size-3 mr-1" aria-hidden="true" /> UPLOAD NEW
                  </Button>
                </div>
                <Input
                  name="picture"
                  value={formData.picture}
                  onChange={handleChange}
                  placeholder="https://example.com/avatar.jpg"
                  className="h-10 rounded-xl bg-background border-none shadow-sm"
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Banner URL</Label>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    type="button"
                    onClick={() => bannerInputRef.current?.click()}
                    className="h-auto p-0 text-[10px] font-black text-primary hover:bg-transparent"
                  >
                    <Upload className="size-3 mr-1" aria-hidden="true" /> UPLOAD NEW
                  </Button>
                </div>
                <Input
                  name="banner"
                  value={formData.banner}
                  onChange={handleChange}
                  placeholder="https://example.com/banner.jpg"
                  className="h-10 rounded-xl bg-background border-none shadow-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="display_name" className="text-sm font-black">Display Name</Label>
              <Input
                id="display_name"
                name="display_name"
                value={formData.display_name}
                onChange={handleChange}
                placeholder="e.g. Satoshi Nakamoto"
                className="h-12 rounded-xl bg-muted/30 border-none shadow-sm focus-visible:ring-primary/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-black">Username (@name)</Label>
              <Input
                id="username"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. satoshi"
                className="h-12 rounded-xl bg-muted/30 border-none shadow-sm focus-visible:ring-primary/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="about" className="text-sm font-black">Bio</Label>
              <Textarea
                id="about"
                name="about"
                rows={3}
                value={formData.about}
                onChange={handleChange}
                placeholder="Tell us about yourself…"
                className="rounded-xl bg-muted/30 border-none shadow-sm focus-visible:ring-primary/20 resize-none min-h-[100px]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 relative">
                <Label htmlFor="website" className="text-sm font-black">Website</Label>
                <div className="relative">
                  <Input
                    id="website"
                    type="url"
                    name="website"
                    value={formData.website}
                    onChange={handleChange}
                    placeholder="https://example.com"
                    className={cn(
                      "h-12 rounded-xl bg-muted/30 border-none shadow-sm pr-10",
                      !validations.website && formData.website && "ring-2 ring-destructive/20 text-destructive"
                    )}
                  />
                  {formData.website && (
                    <div className="absolute right-3 top-3.5">
                      {validations.website ? <Check size={18} className="text-green-500" aria-hidden="true" /> : <AlertCircle size={18} className="text-destructive" aria-hidden="true" />}
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pronouns" className="text-sm font-black">Pronouns</Label>
                <Input
                  id="pronouns"
                  name="pronouns"
                  value={formData.pronouns}
                  onChange={handleChange}
                  placeholder="they/them"
                  className="h-12 rounded-xl bg-muted/30 border-none shadow-sm focus-visible:ring-primary/20"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nip05" className="text-sm font-black">NIP-05 Verification</Label>
              <div className="relative">
                <Input
                  id="nip05"
                  name="nip05"
                  value={formData.nip05}
                  onChange={handleChange}
                  placeholder="name@example.com"
                  className={cn(
                    "h-12 rounded-xl bg-muted/30 border-none shadow-sm pr-10",
                    !validations.nip05 && formData.nip05 && "ring-2 ring-destructive/20 text-destructive"
                  )}
                />
                {formData.nip05 && (
                  <div className="absolute right-3 top-3.5">
                    {validations.nip05 ? <Check size={18} className="text-green-500" aria-hidden="true" /> : <AlertCircle size={18} className="text-destructive" aria-hidden="true" />}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lud16" className="text-sm font-black">Lightning Address (LUD-16)</Label>
              <div className="relative">
                <Input
                  id="lud16"
                  name="lud16"
                  value={formData.lud16}
                  onChange={handleChange}
                  placeholder="name@getalby.com or name@strike.me"
                  className={cn(
                    "h-12 rounded-xl bg-muted/30 border-none shadow-sm pr-10",
                    !validations.lud16 && formData.lud16 && "ring-2 ring-destructive/20 text-destructive"
                  )}
                />
                {formData.lud16 && (
                  <div className="absolute right-3 top-3.5">
                    {validations.lud16 ? <Check size={18} className="text-green-500" aria-hidden="true" /> : <AlertCircle size={18} className="text-destructive" aria-hidden="true" />}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <Label className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Tag size={14} aria-hidden="true" />
                Interests (NIP-51)
              </Label>
              
              <div className="flex flex-wrap gap-2">
                {Array.from(interests).map((interest) => (
                  <Badge 
                    key={interest} 
                    variant="secondary"
                    className="h-8 gap-1.5 px-3 rounded-full font-black bg-primary/10 text-primary border-primary/20 group"
                  >
                    #{interest}
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Remove #${interest}?`)) {
                          removeInterest(interest);
                        }
                      }}
                      className="hover:text-destructive transition-colors"
                      aria-label={`Remove #${interest}`}
                    >
                      <X size={12} strokeWidth={3} aria-hidden="true" />
                    </button>
                  </Badge>
                ))}
                {interests.size === 0 && (
                  <p className="text-xs text-muted-foreground italic font-medium px-1">No interests added yet. Add some hashtags below!</p>
                )}
              </div>

              <div className="flex gap-2">
                <Input
                  value={interestInput}
                  onChange={(e) => setInterestInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (interestInput.trim()) {
                        addInterest(interestInput.trim());
                        setInterestInput("");
                      }
                    }
                  }}
                  placeholder="Add a hashtag (e.g. bitcoin, nostr)"
                  className="h-11 rounded-xl bg-muted/30 border-none shadow-sm"
                />
                <Button
                  type="button"
                  onClick={() => {
                    if (interestInput.trim()) {
                      addInterest(interestInput.trim());
                      setInterestInput("");
                    }
                  }}
                  variant="secondary"
                  className="h-11 rounded-xl font-black px-6"
                >
                  Add
                </Button>
              </div>
            </div>

            <Separator />

            <div className="space-y-4 pt-2 pb-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <ShieldCheck size={14} aria-hidden="true" />
                  Verified Identities (NIP-39)
                </Label>
                <Button 
                  variant="ghost" 
                  size="sm"
                  type="button"
                  onClick={() => setShowIdHelp(!showIdHelp)}
                  className="h-auto p-0 text-[10px] font-black text-primary hover:bg-transparent"
                >
                  <Info className="size-3 mr-1" aria-hidden="true" /> {showIdHelp ? "HIDE GUIDE" : "HOW TO VERIFY?"}
                </Button>
              </div>

              {showIdHelp && (
                <div className="p-4 bg-primary/10 rounded-2xl border border-primary/20 text-[11px] space-y-3 animate-in slide-in-from-top-2 duration-300">
                  <div>
                    <p className="font-black text-primary uppercase mb-1">GitHub</p>
                    <p className="text-muted-foreground font-medium">Create a Gist with: <code className="bg-background p-0.5 rounded text-[10px] border border-border">Verifying that I control the following Nostr public key: [your_npub]</code>. Paste the Gist ID as proof.</p>
                  </div>
                  <div>
                    <p className="font-black text-primary uppercase mb-1">Twitter</p>
                    <p className="text-muted-foreground font-medium">Tweet: <code className="bg-background p-0.5 rounded text-[10px] border border-border">Verifying my account on nostr My Public Key: &quot;[your_npub]&quot;</code>. Paste the Tweet ID as proof.</p>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2">
                {externalIdentities.map((id, index) => (
                  <div 
                    key={`${id.platform}-${id.identity}-${index}`}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border border-border group transition-all hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <ShieldCheck size={16} aria-hidden="true" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-tighter text-primary">{id.platform}</p>
                        <p className="text-sm font-bold truncate max-w-[180px]">{id.identity}</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => {
                        if (confirm(`Remove ${id.platform} identity (${id.identity})?`)) {
                          removeExternalIdentity(id.platform, id.identity);
                        }
                      }}
                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                      aria-label={`Remove ${id.platform} identity`}
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </Button>
                  </div>
                ))}
                
                {externalIdentities.length === 0 && (
                  <p className="text-xs text-muted-foreground italic font-medium px-1">No verified identities yet.</p>
                )}
              </div>

              <Card className="rounded-2xl border-border bg-muted/20 shadow-none overflow-hidden mt-4">
                <CardContent className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-black text-muted-foreground ml-1">Platform</Label>
                      <Select
                        value={idInput.platform}
                        onValueChange={(val) => setIdInput(prev => ({ ...prev, platform: val }))}
                      >
                        <SelectTrigger className="h-10 rounded-xl bg-background border-none shadow-sm font-black text-xs">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="github">GitHub</SelectItem>
                          <SelectItem value="twitter">Twitter</SelectItem>
                          <SelectItem value="telegram">Telegram</SelectItem>
                          <SelectItem value="mastodon">Mastodon</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-black text-muted-foreground ml-1">Username</Label>
                      <Input
                        placeholder="Username"
                        value={idInput.identity}
                        onChange={(e) => setIdInput(prev => ({ ...prev, identity: e.target.value }))}
                        className="h-10 rounded-xl bg-background border-none shadow-sm text-xs font-bold"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black text-muted-foreground ml-1">Proof ID</Label>
                    <Input
                      placeholder="Proof (Gist ID, Tweet ID, etc.)"
                      value={idInput.proof}
                      onChange={(e) => setIdInput(prev => ({ ...prev, proof: e.target.value }))}
                      className="h-10 rounded-xl bg-background border-none shadow-sm text-xs font-bold"
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={() => {
                      if (idInput.identity && idInput.proof) {
                        addExternalIdentity(idInput.platform, idInput.identity, idInput.proof);
                        setIdInput({ platform: "github", identity: "", proof: "" });
                      }
                    }}
                    disabled={!idInput.identity || !idInput.proof}
                    variant="secondary"
                    className="w-full h-10 rounded-xl font-black text-xs uppercase tracking-widest"
                  >
                    Add Verified Identity
                  </Button>
                </CardContent>
              </Card>
            </div>
            
            <div className="flex gap-3 pt-6">
              {onCancel && (
                <Button 
                  variant="ghost" 
                  type="button" 
                  onClick={onCancel}
                  className="flex-1 h-12 rounded-2xl font-black"
                >
                  Cancel
                </Button>
              )}
              <Button 
                type="submit" 
                disabled={loading}
                className="flex-1 h-12 rounded-2xl font-black shadow-lg shadow-primary/20"
              >
                {loading ? <Loader2 className="animate-spin size-5 mr-2" /> : null}
                Save Profile
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
