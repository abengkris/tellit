"use client";

import React, { useState, useEffect } from "react";
import { X, Camera, Image as ImageIcon, Loader2, AlertCircle, Check } from "lucide-react";
import { ProfileMetadata } from "@/hooks/useProfile";
import { updateProfile } from "@/lib/actions/profile";
import { useNDK } from "@/hooks/useNDK";
import { useUIStore } from "@/store/ui";
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
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<ProfileMetadata>({
    name: "",
    displayName: "",
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
    nip05: true
  });

  useEffect(() => {
    if (currentProfile) {
      setFormData({
        name: currentProfile.name || "",
        displayName: currentProfile.displayName || "",
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
    
    setValidations({
      website: isWebsiteValid,
      nip05: isNip05Valid
    });
  }, [formData.website, formData.nip05]);

  if (!isOpen) return null;

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
    setFormData(prev => ({ ...prev, [name]: value }));
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
          <div className="relative h-40 bg-gray-200 dark:bg-gray-800">
            {formData.banner ? (
              <Image src={formData.banner} alt="Banner preview" fill className="object-cover" unoptimized />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-blue-400 to-purple-500 opacity-20" />
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
              <ImageIcon className="text-white drop-shadow-md" size={32} />
            </div>
          </div>

          <div className="px-6 pb-6 relative">
            {/* Avatar Preview */}
            <div className="relative -mt-12 mb-6 inline-block">
              <div className="w-24 h-24 rounded-full border-4 border-white dark:border-black overflow-hidden bg-gray-100 dark:bg-gray-900 shadow-md">
                <Image 
                  src={formData.picture || `https://robohash.org/placeholder?set=set4`} 
                  alt="Avatar preview" 
                  width={96} 
                  height={96} 
                  className="w-full h-full object-cover"
                  unoptimized
                />
              </div>
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full pointer-events-none">
                <Camera className="text-white" size={24} />
              </div>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 gap-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Avatar URL</label>
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
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Banner URL</label>
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
                  name="displayName"
                  value={formData.displayName}
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
                  placeholder="Tell us about yourself..."
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
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
