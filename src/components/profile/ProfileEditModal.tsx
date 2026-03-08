"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Camera, Image as ImageIcon, Loader2, AlertCircle, Check, Upload, Tag, ShieldCheck, Trash2 } from "lucide-react";
import { ProfileMetadata } from "@/hooks/useProfile";
import { updateProfile } from "@/lib/actions/profile";
import { useNDK } from "@/hooks/useNDK";
import { useUIStore } from "@/store/ui";
import { useBlossom } from "@/hooks/useBlossom";
import { useLists } from "@/hooks/useLists";
import Image from "next/image";

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: ProfileMetadata | null;
  onSuccess?: () => void;
}

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({
  isOpen,
  onClose,
  currentProfile,
  onSuccess
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
  }, [currentProfile, isOpen]);

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

  if (!isOpen) return null;

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ndk) return;

    setLoading(true);
    try {
      const profileSuccess = await updateProfile(ndk, formData);
      
      if (profileSuccess) {
        addToast("Profile updated successfully!", "success");
        onSuccess?.();
        onClose();
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-black w-full max-w-xl rounded-2xl overflow-hidden flex flex-col max-h-[90vh] shadow-2xl border border-gray-200 dark:border-gray-800 animate-in zoom-in-95">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-4">
            <button 
              onClick={onClose} 
              aria-label="Close modal"
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold">Edit Profile</h2>
          </div>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-full font-bold transition-all"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : "Save"}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Banner Preview */}
          <div className="relative h-40 bg-gray-200 dark:bg-gray-800 group">
            {formData.banner ? (
              <Image src={formData.banner} alt="Banner preview" fill className="object-cover" unoptimized />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-blue-400 to-purple-500 opacity-20" />
            )}
            <button 
              type="button"
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/20 group-hover:bg-black/40 cursor-pointer transition-all gap-2 w-full"
              onClick={() => bannerInputRef.current?.click()}
              aria-label="Change Banner"
            >
              {uploadingBanner ? (
                <Loader2 className="text-white animate-spin" size={32} />
              ) : (
                <>
                  <ImageIcon className="text-white drop-shadow-md" size={32} />
                  <span className="text-white text-[10px] font-bold uppercase tracking-widest drop-shadow-md bg-black/40 px-3 py-1.5 rounded-full border border-white/20 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">Change Banner</span>
                </>
              )}
            </button>
            <input 
              type="file" 
              ref={bannerInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={(e) => handleFileChange(e, 'banner')}
            />
          </div>

          <div className="px-6 pb-6 relative">
            {/* Avatar Preview */}
            <div className="relative -mt-12 mb-6 inline-block group">
              <div className="w-24 h-24 rounded-full border-4 border-white dark:border-black overflow-hidden bg-gray-100 dark:bg-gray-900 shadow-md">
                <Image 
                  src={formData.picture || `https://robohash.org/placeholder?set=set1`} 
                  alt="Avatar preview" 
                  width={96} 
                  height={96} 
                  className="w-full h-full object-cover"
                  unoptimized
                />
              </div>
              <button 
                type="button"
                className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/60 rounded-full cursor-pointer transition-all w-full"
                onClick={() => avatarInputRef.current?.click()}
                aria-label="Change Avatar"
              >
                {uploadingAvatar ? (
                  <Loader2 className="text-white animate-spin" size={24} />
                ) : (
                  <Camera className="text-white" size={24} />
                )}
              </button>
              <input 
                type="file" 
                ref={avatarInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={(e) => handleFileChange(e, 'picture')}
              />
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 gap-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Avatar URL</label>
                    <button 
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      className="text-[10px] font-bold text-blue-500 hover:text-blue-600 flex items-center gap-1 transition-colors"
                    >
                      <Upload size={10} /> Upload New
                    </button>
                  </div>
                  <input
                    type="text"
                    name="picture"
                    value={formData.picture}
                    onChange={handleChange}
                    placeholder="https://example.com/avatar.jpg"
                    className="w-full bg-transparent border border-gray-200 dark:border-gray-800 rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Banner URL</label>
                    <button 
                      type="button"
                      onClick={() => bannerInputRef.current?.click()}
                      className="text-[10px] font-bold text-blue-500 hover:text-blue-600 flex items-center gap-1 transition-colors"
                    >
                      <Upload size={10} /> Upload New
                    </button>
                  </div>
                  <input
                    type="text"
                    name="banner"
                    value={formData.banner}
                    onChange={handleChange}
                    placeholder="https://example.com/banner.jpg"
                    className="w-full bg-transparent border border-gray-200 dark:border-gray-800 rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Display Name</label>
                <input
                  type="text"
                  name="display_name"
                  value={formData.display_name}
                  onChange={handleChange}
                  placeholder="e.g. Satoshi Nakamoto"
                  className="w-full bg-transparent border border-gray-200 dark:border-gray-800 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Username (@name)</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. satoshi"
                  className="w-full bg-transparent border border-gray-200 dark:border-gray-800 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Bio</label>
                <textarea
                  name="about"
                  rows={3}
                  value={formData.about}
                  onChange={handleChange}
                  placeholder="Tell us about yourself…"
                  className="w-full bg-transparent border border-gray-200 dark:border-gray-800 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 relative">
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Website</label>
                  <div className="relative">
                    <input
                      type="url"
                      name="website"
                      value={formData.website}
                      onChange={handleChange}
                      placeholder="https://example.com"
                      className={`w-full bg-transparent border rounded-xl p-3 pr-10 outline-none focus:ring-2 transition-all ${
                        !validations.website && formData.website 
                          ? "border-red-500 focus:ring-red-500/20" 
                          : "border-gray-200 dark:border-gray-800 focus:ring-blue-500/20 focus:border-blue-500"
                      }`}
                    />
                    {formData.website && (
                      <div className="absolute right-3 top-3 text-gray-400">
                        {validations.website ? <Check size={18} className="text-green-500" /> : <AlertCircle size={18} className="text-red-500" />}
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Pronouns</label>
                  <input
                    type="text"
                    name="pronouns"
                    value={formData.pronouns}
                    onChange={handleChange}
                    placeholder="they/them"
                    className="w-full bg-transparent border border-gray-200 dark:border-gray-800 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">NIP-05 Verification</label>
                <div className="relative">
                  <input
                    type="text"
                    name="nip05"
                    value={formData.nip05}
                    onChange={handleChange}
                    placeholder="name@example.com"
                    className={`w-full bg-transparent border rounded-xl p-3 pr-10 outline-none focus:ring-2 transition-all ${
                      !validations.nip05 && formData.nip05
                        ? "border-red-500 focus:ring-red-500/20" 
                        : "border-gray-200 dark:border-gray-800 focus:ring-blue-500/20 focus:border-blue-500"
                    }`}
                  />
                  {formData.nip05 && (
                    <div className="absolute right-3 top-3 text-gray-400">
                      {validations.nip05 ? <Check size={18} className="text-green-500" /> : <AlertCircle size={18} className="text-red-500" />}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Lightning Address (LUD-16)</label>
                <div className="relative">
                  <input
                    type="text"
                    name="lud16"
                    value={formData.lud16}
                    onChange={handleChange}
                    placeholder="name@getalby.com or name@strike.me"
                    className={`w-full bg-transparent border rounded-xl p-3 pr-10 outline-none focus:ring-2 transition-all ${
                      !validations.lud16 && formData.lud16
                        ? "border-red-500 focus:ring-red-500/20" 
                        : "border-gray-200 dark:border-gray-800 focus:ring-blue-500/20 focus:border-blue-500"
                    }`}
                  />
                  {formData.lud16 && (
                    <div className="absolute right-3 top-3 text-gray-400">
                      {validations.lud16 ? <Check size={18} className="text-green-500" /> : <AlertCircle size={18} className="text-red-500" />}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <label className="text-sm font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                  <Tag size={14} />
                  Interests (NIP-51)
                </label>
                
                <div className="flex flex-wrap gap-2 mb-3">
                  {Array.from(interests).map((interest) => (
                    <span 
                      key={interest} 
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-xs font-bold border border-blue-100 dark:border-blue-900/30 group"
                    >
                      #{interest}
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Remove #${interest}?`)) {
                            removeInterest(interest);
                          }
                        }}
                        className="hover:text-red-500 transition-colors"
                      >
                        <X size={12} strokeWidth={3} />
                      </button>
                    </span>
                  ))}
                  {interests.size === 0 && (
                    <p className="text-xs text-gray-500 italic">No interests added yet. Add some hashtags below!</p>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
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
                    className="flex-1 bg-transparent border border-gray-200 dark:border-gray-800 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (interestInput.trim()) {
                        addInterest(interestInput.trim());
                        setInterestInput("");
                      }
                    }}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-xl font-bold transition-all text-sm"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                    <ShieldCheck size={14} />
                    Verified Identities (NIP-39)
                  </label>
                  <button 
                    type="button"
                    onClick={() => setShowIdHelp(!showIdHelp)}
                    className="text-[10px] font-bold text-blue-500 hover:underline"
                  >
                    {showIdHelp ? "Hide guide" : "How to verify?"}
                  </button>
                </div>

                {showIdHelp && (
                  <div className="p-4 bg-blue-50/20 dark:bg-blue-900/10 rounded-2xl border border-blue-100/50 dark:border-blue-900/20 text-[11px] space-y-3 animate-in slide-in-from-top-2 duration-300">
                    <div>
                      <p className="font-black text-blue-500 uppercase mb-1">GitHub</p>
                      <p className="text-gray-500 dark:text-gray-400">Create a Gist with: <code className="bg-white dark:bg-black p-0.5 rounded text-[10px]">Verifying that I control the following Nostr public key: [your_npub]</code>. Paste the Gist ID as proof.</p>
                    </div>
                    <div>
                      <p className="font-black text-blue-500 uppercase mb-1">Twitter</p>
                      <p className="text-gray-500 dark:text-gray-400">Tweet: <code className="bg-white dark:bg-black p-0.5 rounded text-[10px]">Verifying my account on nostr My Public Key: &quot;[your_npub]&quot;</code>. Paste the Tweet ID as proof.</p>
                    </div>
                    <div>
                      <p className="font-black text-blue-500 uppercase mb-1">Mastodon</p>
                      <p className="text-gray-500 dark:text-gray-400">Post verification text on your instance. Identity format: <code className="bg-white dark:bg-black p-0.5 rounded text-[10px]">instance.com/@user</code>. Proof: Post ID.</p>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-3">
                  {externalIdentities.map((id, index) => (
                    <div 
                      key={`${id.platform}-${id.identity}-${index}`}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800 group"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500">
                          <ShieldCheck size={16} />
                        </div>
                        <div>
                          <p className="text-xs font-black uppercase tracking-tighter text-blue-500">{id.platform}</p>
                          <p className="text-sm font-bold truncate max-w-[180px]">{id.identity}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Remove ${id.platform} identity (${id.identity})?`)) {
                            removeExternalIdentity(id.platform, id.identity);
                          }
                        }}
                        className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  
                  {externalIdentities.length === 0 && (
                    <p className="text-xs text-gray-500 italic">No verified identities yet.</p>
                  )}
                </div>

                <div className="p-4 bg-blue-50/30 dark:bg-blue-900/5 rounded-2xl border border-blue-100/50 dark:border-blue-900/20 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={idInput.platform}
                      onChange={(e) => setIdInput(prev => ({ ...prev, platform: e.target.value }))}
                      className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl p-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="github">GitHub</option>
                      <option value="twitter">Twitter</option>
                      <option value="telegram">Telegram</option>
                      <option value="mastodon">Mastodon</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Username"
                      value={idInput.identity}
                      onChange={(e) => setIdInput(prev => ({ ...prev, identity: e.target.value }))}
                      className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl p-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Proof (Gist ID, Tweet ID, etc.)"
                    value={idInput.proof}
                    onChange={(e) => setIdInput(prev => ({ ...prev, proof: e.target.value }))}
                    className="w-full bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl p-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (idInput.identity && idInput.proof) {
                        addExternalIdentity(idInput.platform, idInput.identity, idInput.proof);
                        setIdInput({ platform: "github", identity: "", proof: "" });
                      }
                    }}
                    disabled={!idInput.identity || !idInput.proof}
                    className="w-full py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-xl font-black text-xs transition-all uppercase tracking-widest"
                  >
                    Add Verified Identity
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
