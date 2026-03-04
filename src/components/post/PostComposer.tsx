"use client";

import React, { useState, useRef, useEffect } from "react";
import { useAuthStore } from "@/store/auth";
import { useNDK } from "@/hooks/useNDK";
import { publishPost } from "@/lib/actions/post";
import { PollOption } from "@/lib/actions/poll";
import { ImageIcon, Calendar, Smile, MapPin, Loader2, X, AlertTriangle, List } from "lucide-react";
import Image from "next/image";
import { useUIStore } from "@/store/ui";
import { useBlossom } from "@/hooks/useBlossom";
import { imetaTagToTag, NDKImetaTag, NDKTag, NDKEvent } from "@nostr-dev-kit/ndk";

interface PostComposerProps {
  replyTo?: NDKEvent;
  quoteEvent?: NDKEvent;
  onSuccess?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export const PostComposer: React.FC<PostComposerProps> = ({ 
  replyTo, 
  quoteEvent,
  onSuccess, 
  placeholder = "What's happening?",
  autoFocus = false 
}) => {
  const [content, setContent] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [imetaTags, setImetaTags] = useState<NDKImetaTag[]>([]);
  const [isSensitive, setIsSensitive] = useState(false);
  const [contentWarning, setContentWarning] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showPoll, setShowPoll] = useState(false);
  const [pollOptions, setPollOptions] = useState<PollOption[]>([
    { id: "0", label: "" },
    { id: "1", label: "" }
  ]);
  const { user, isLoggedIn } = useAuthStore();
  const { ndk } = useNDK();
  const { addToast } = useUIStore();
  const { uploadFile } = useBlossom();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);

  // Collapse when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (composerRef.current && !composerRef.current.contains(event.target as Node) && !content.trim()) {
        setIsExpanded(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [content]);

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
      setIsExpanded(true);
    }
  }, [autoFocus]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content]);

  const handlePost = async () => {
    if (!ndk || !content.trim() || isSubmitting) return;

    // Validate poll if active
    if (showPoll) {
      const validOptions = pollOptions.filter(o => o.label.trim() !== "");
      if (validOptions.length < 2) {
        addToast("Poll must have at least 2 options", "error");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const tags: NDKTag[] = imetaTags.map(imetaTagToTag);
      
      if (isSensitive) {
        tags.push(["content-warning", contentWarning]);
      }

      const pollOptionsData = showPoll ? {
        options: pollOptions.filter(o => o.label.trim() !== ""),
        pollType: "singlechoice" as const,
        // Default to 24h
        endsAt: Math.floor(Date.now() / 1000) + 86400
      } : undefined;

      await publishPost(ndk, content, { tags, replyTo, quoteEvent, pollOptions: pollOptionsData });
      setContent("");
      setImetaTags([]);
      setIsSensitive(false);
      setContentWarning("");
      setShowPoll(false);
      setPollOptions([{ id: "0", label: "" }, { id: "1", label: "" }]);
      
      let successMsg = "Post published successfully!";
      if (replyTo) successMsg = "Reply sent!";
      else if (quoteEvent) successMsg = "Quote shared!";
      else if (showPoll) successMsg = "Poll created!";
      
      addToast(successMsg, "success");
      onSuccess?.();
    } catch (err) {
      console.error("Failed to post details:", err);
      addToast(`Failed to publish post: ${(err as Error).message || "Unknown error"}`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const result = await uploadFile(file, (progress) => {
        const percent = Math.round((progress.loaded / progress.total) * 100);
        setUploadProgress(percent);
      });

      if (result && result.url) {
        // Collect imeta tag
        setImetaTags((prev) => [...prev, result]);

        // Standard Nostr behavior: append URL to content
        setContent((prev) => {
          const suffix = prev.endsWith("\n") || prev === "" ? "" : "\n";
          return `${prev}${suffix}${result.url}`;
        });
        addToast("Media uploaded successfully!", "success");
      }
    } catch (err) {
      console.error("Upload failed:", err);
      addToast("Failed to upload media.", "error");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (!isLoggedIn) return null;

  const updatePollOption = (index: number, label: string) => {
    setPollOptions(prev => {
      const next = [...prev];
      next[index] = { ...next[index], label };
      return next;
    });
  };

  const addPollOption = () => {
    if (pollOptions.length >= 5) return;
    setPollOptions(prev => [...prev, { id: String(prev.length), label: "" }]);
  };

  const removePollOption = (index: number) => {
    if (pollOptions.length <= 2) return;
    setPollOptions(prev => prev.filter((_, i) => i !== index));
  };

  const removeMedia = (index: number) => {
    const tag = imetaTags[index];
    if (!tag.url) return;
    
    setImetaTags((prev) => prev.filter((_, i) => i !== index));
    // Remove URL from content
    setContent((prev) => prev.replace(tag.url!, "").trim());
  };

  return (
    <div 
      ref={composerRef}
      className={`flex p-4 transition-all duration-300 ${
        !replyTo ? "border-b border-gray-200 dark:border-gray-800" : ""
      } ${isExpanded ? "bg-white dark:bg-black" : "bg-transparent hover:bg-gray-50 dark:hover:bg-gray-900/30"}`}
      onFocus={() => setIsExpanded(true)}
    >
      <div className="mr-3 shrink-0">
        <Image
          src={user?.profile?.picture || `https://robohash.org/${user?.pubkey}?set=set1`}
          alt="Avatar"
          width={48}
          height={48}
          className={`rounded-full object-cover bg-gray-200 transition-all duration-300 ${
            isExpanded ? "w-12 h-12" : "w-10 h-10"
          }`}
          unoptimized={true}
        />
      </div>
      
      <div className="flex-1 min-w-0">
        <label htmlFor="post-content" className="sr-only">Post content</label>
        <textarea
          id="post-content"
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={replyTo ? "Post your reply" : placeholder}
          className={`w-full bg-transparent border-none focus:ring-0 resize-none placeholder-gray-500 transition-all duration-300 overflow-hidden ${
            isExpanded ? "text-xl min-h-[100px]" : "text-lg min-h-[40px]"
          }`}
        />

        <div className={`transition-all duration-500 overflow-hidden ${isExpanded || content.trim() ? "max-h-[800px] opacity-100 mt-2" : "max-h-0 opacity-0 mt-0"}`}>
          {isSensitive && (
            <div className="mb-3 px-3 py-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl flex items-center gap-3">
              <AlertTriangle size={18} className="text-amber-500 shrink-0" />
              <input
                type="text"
                value={contentWarning}
                onChange={(e) => setContentWarning(e.target.value)}
                placeholder="Reason (optional)"
                className="flex-1 bg-transparent border-none focus:ring-0 text-sm p-0 placeholder-amber-500/50 text-amber-700 dark:text-amber-400 outline-none"
              />
              <button 
                onClick={() => setIsSensitive(false)}
                className="text-amber-500 hover:text-amber-600"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {imetaTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {imetaTags.map((tag, i) => (
                <div key={i} className="relative group w-24 h-24 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                  {tag.m?.startsWith("image/") ? (
                    <img src={tag.url} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">
                      Video
                    </div>
                  )}
                  <button
                    onClick={() => removeMedia(i)}
                    className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors"
                    aria-label="Remove media"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {showPoll && (
            <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-3 animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Poll Options</span>
                <button 
                  onClick={() => setShowPoll(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <X size={14} />
                </button>
              </div>
              {pollOptions.map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    value={opt.label}
                    onChange={(e) => updatePollOption(i, e.target.value)}
                    placeholder={`Option ${i + 1}`}
                    className="flex-1 bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  {pollOptions.length > 2 && (
                    <button 
                      onClick={() => removePollOption(i)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
              ))}
              {pollOptions.length < 5 && (
                <button
                  onClick={addPollOption}
                  className="text-xs font-bold text-blue-500 hover:text-blue-600 transition-colors pl-1"
                >
                  + Add another option
                </button>
              )}
            </div>
          )}

          {isUploading && (
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span className="flex items-center gap-1">
                  <Loader2 size={12} className="animate-spin" />
                  Uploading media…
                </span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-[width] duration-300" 
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
          
          <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-900 pt-3 mt-3">
            <div className="flex items-center -ml-2 text-blue-500">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*,video/*"
                className="hidden"
              />
              <button 
                title="Add image"
                aria-label="Add image"
                onClick={handleImageClick}
                disabled={isUploading}
                className={`p-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors ${
                  isUploading ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                <ImageIcon size={20} />
              </button>
              <button 
                title="Add emoji"
                aria-label="Add emoji"
                className="p-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors"
              >
                <Smile size={20} />
              </button>
              <button 
                title="Add poll"
                aria-label="Add poll"
                onClick={() => setShowPoll(!showPoll)}
                className={`p-3 rounded-full transition-transform transition-colors ${
                  showPoll 
                    ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30 scale-110" 
                    : "hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500"
                }`}
              >
                <List size={20} />
              </button>
              <button 
                title="Schedule post"
                aria-label="Schedule post"
                className="p-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors opacity-50 cursor-not-allowed"
              >
                <Calendar size={20} />
              </button>
              <button 
                title="Add location"
                aria-label="Add location"
                className="p-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors opacity-50 cursor-not-allowed"
              >
                <MapPin size={20} />
              </button>
              <button 
                title="Add content warning"
                aria-label="Content Warning"
                aria-pressed={isSensitive}
                onClick={() => setIsSensitive(!isSensitive)}
                className={`p-3 rounded-full transition-transform transition-colors ${
                  isSensitive 
                    ? "bg-amber-500 text-white shadow-lg shadow-amber-500/30 scale-110" 
                    : "hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500"
                }`}
              >
                <AlertTriangle size={20} fill={isSensitive ? "currentColor" : "none"} />
              </button>
            </div>
            
            <button
              onClick={handlePost}
              disabled={!content.trim() || isSubmitting || isUploading}
              className={`px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-full transition-transform transition-colors flex items-center gap-2 ${
                (!content.trim() || isSubmitting || isUploading) ? "opacity-50 cursor-not-allowed" : "active:scale-95"
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Posting…</span>
                </>
              ) : (
                replyTo ? "Reply" : quoteEvent ? "Quote" : "Post"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
