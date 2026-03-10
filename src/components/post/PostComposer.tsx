"use client";

import React, { useState, useRef, useEffect } from "react";
import { useAuthStore } from "@/store/auth";
import { useNDK } from "@/hooks/useNDK";
import { publishPost, ZapSplit } from "@/lib/actions/post";
import { createPoll, PollOption } from "@/lib/actions/poll";
import { useUIStore } from "@/store/ui";
import { useBlossom } from "@/hooks/useBlossom";
import { useEmojis } from "@/hooks/useEmojis";
import { useDrafts } from "@/hooks/useDrafts";
import { useProfile } from "@/hooks/useProfile";
import { NDKEvent, NDKTag } from "@nostr-dev-kit/ndk";
import { 
  ImageIcon, 
  Smile, 
  X, 
  Loader2, 
  BarChart2,
  Users
} from "lucide-react";
import { Avatar } from "../common/Avatar";
import { PollEditor } from "./PollEditor";
import { CollaboratorEditor } from "./CollaboratorEditor";
import { useMentionSearch } from "@/hooks/useMentionSearch";

interface PostComposerProps {
  replyTo?: NDKEvent;
  quoteEvent?: NDKEvent;
  placeholder?: string;
  onSuccess?: () => void;
  autoFocus?: boolean;
}

export const PostComposer: React.FC<PostComposerProps> = ({ 
  replyTo, 
  quoteEvent,
  placeholder = "What's happening?", 
  onSuccess,
  autoFocus = false
}) => {
  const { user, isLoggedIn } = useAuthStore();
  const { ndk, isReady } = useNDK();
  const { addToast } = useUIStore();
  const { uploadFile } = useBlossom();
  const { emojis } = useEmojis();
  const { profile } = useProfile(user?.pubkey);
  
  // Create a unique key for the draft
  const draftKey = replyTo ? `reply-${replyTo.id}` : quoteEvent ? `quote-${quoteEvent.id}` : 'main-composer';
  const { draft, updateDraft, clearDraft, isLoaded } = useDrafts(draftKey);

  const [content, setContent] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showPollEditor, setShowPollEditor] = useState(false);
  const [showCollaboratorEditor, setShowCollaboratorEditor] = useState(false);
  
  // Mention state
  const [mentionQuery, setMentionQuery] = useState("");
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [cursorPos, setCursorPos] = useState(0);
  const { results: mentionResults } = useMentionSearch(mentionQuery);
  
  const [pollOptions, setPollOptions] = useState<PollOption[]>([
    { id: "0", label: "" },
    { id: "1", label: "" }
  ]);
  const [zapSplits, setZapSplits] = useState<ZapSplit[]>([]);
  const [mediaFiles, setMediaFiles] = useState<{ url: string; type: string; imeta?: NDKTag }[]>([]);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync content with draft when loaded
  useEffect(() => {
    if (isLoaded && draft) {
      setContent(draft);
    }
  }, [isLoaded, draft]);

  // Update draft whenever content changes
  useEffect(() => {
    if (isLoaded) {
      updateDraft(content);
    }
  }, [content, isLoaded, updateDraft]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const pos = e.target.selectionStart;
    setContent(val);
    setCursorPos(pos);

    // Detect mention trigger
    const lastAt = val.lastIndexOf("@", pos - 1);
    if (lastAt !== -1) {
      const query = val.slice(lastAt + 1, pos);
      if (!query.includes(" ") && query.length > 0) {
        setMentionQuery(query);
        setShowMentionPicker(true);
        return;
      }
    }
    setShowMentionPicker(false);
  };

  const insertMention = (npub: string) => {
    const lastAt = content.lastIndexOf("@", cursorPos - 1);
    if (lastAt !== -1) {
      const before = content.slice(0, lastAt);
      const after = content.slice(cursorPos);
      const newContent = `${before}nostr:${npub} ${after}`;
      setContent(newContent);
      setShowMentionPicker(false);
      setTimeout(() => {
        textareaRef.current?.focus();
        const newPos = before.length + npub.length + 7; // nostr: + space
        textareaRef.current?.setSelectionRange(newPos, newPos);
      }, 0);
    }
  };

  const handlePost = async () => {
    if (!content.trim() && mediaFiles.length === 0) return;
    if (!ndk || !isReady || !isLoggedIn) {
      addToast("Please login to post", "error");
      return;
    }

    // Validate poll if enabled
    if (showPollEditor) {
      const validOptions = pollOptions.filter(o => o.label.trim().length > 0);
      if (validOptions.length < 2) {
        addToast("Poll needs at least 2 options", "error");
        return;
      }
    }

    setIsPosting(true);
    try {
      // Append media URLs to content if not already there
      let finalContent = content;
      mediaFiles.forEach(file => {
        if (!finalContent.includes(file.url)) {
          finalContent += `\n\n${file.url}`;
        }
      });

      let event: NDKEvent | null = null;

      if (showPollEditor) {
        const validOptions = pollOptions.filter(o => o.label.trim().length > 0);
        event = await createPoll(ndk, finalContent, {
          options: validOptions,
          endsAt: Math.floor(Date.now() / 1000) + 86400, // 24h default
        });
      } else {
        const tags: NDKTag[] = [];
        // Add imeta tags for Blossom media (NIP-92)
        mediaFiles.forEach(file => {
          if (file.imeta) {
            tags.push(file.imeta);
          }
        });

        // Add emoji tags (NIP-30) - naive check
        // A robust implementation would parse the content for :shortcode:
        emojis.forEach(e => {
          if (finalContent.includes(`:${e.shortcode}:`)) {
            tags.push(["emoji", e.shortcode, e.url]);
          }
        });

        const options = {
          replyTo,
          quoteEvent,
          tags,
          zapSplits
        };

        event = await publishPost(ndk, finalContent, options);
      }

      if (event) {
        addToast(showPollEditor ? "Poll published!" : "Posted successfully!", "success");
        setContent("");
        setMediaFiles([]);
        setShowPollEditor(false);
        setShowCollaboratorEditor(false);
        setPollOptions([{ id: "0", label: "" }, { id: "1", label: "" }]);
        setZapSplits([]);
        clearDraft();
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      console.error(err);
      addToast("Failed to post. Please try again.", "error");
    } finally {
      setIsPosting(false);
    }
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);
    try {
      for (const file of files) {
        const result = await uploadFile(file);
        if (result && result.url) {
          const url = result.url;
          setMediaFiles(prev => [...prev, { 
            url, 
            type: file.type,
            imeta: result.sha256 ? ["imeta", `url ${url}`, `m ${file.type}`, `x ${result.sha256}`] as NDKTag : undefined
          }]);
        }
      }
      addToast("Media uploaded!", "success");
    } catch (err) {
      console.error("Failed to upload media:", err);
      addToast("Failed to upload media.", "error");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeMedia = (url: string) => {
    setMediaFiles(prev => prev.filter(f => f.url !== url));
  };

  const insertEmoji = (shortcode: string) => {
    const start = textareaRef.current?.selectionStart || content.length;
    const end = textareaRef.current?.selectionEnd || content.length;
    const newContent = content.substring(0, start) + ` :${shortcode}: ` + content.substring(end);
    setContent(newContent);
    setShowEmojiPicker(false);
    
    // Return focus to textarea
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  };

  if (!isLoggedIn) return null;

  return (
    <div className={`p-4 ${replyTo ? "" : "border-b border-gray-100 dark:border-gray-800"}`}>
      <div className="flex gap-3">
        <Avatar pubkey={user?.pubkey || ""} src={profile?.picture || (profile as { image?: string })?.image} size={48} />
        
        <div className="flex-1 min-w-0 relative">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleContentChange}
            onClick={() => setCursorPos(textareaRef.current?.selectionStart || 0)}
            onKeyUp={() => setCursorPos(textareaRef.current?.selectionStart || 0)}
            placeholder={placeholder}
            autoFocus={autoFocus}
            rows={3}
            className="w-full bg-transparent text-lg resize-none outline-none placeholder-gray-500 py-2"
          />

          {showMentionPicker && mentionResults.length > 0 && (
            <div className="absolute z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg max-h-48 overflow-y-auto w-64 animate-in fade-in zoom-in-95">
              {mentionResults.map(u => (
                <button
                  key={u.pubkey}
                  onClick={() => insertMention(u.npub)}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
                >
                  <Avatar pubkey={u.pubkey} size={24} />
                  <div className="min-w-0">
                    <div className="font-bold text-sm truncate">{u.profile?.display_name || u.profile?.name}</div>
                    <div className="text-xs text-gray-500 truncate">@{u.profile?.name}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {showPollEditor && (
            <PollEditor 
              options={pollOptions} 
              setOptions={setPollOptions} 
              onClose={() => setShowPollEditor(false)} 
            />
          )}

          {showCollaboratorEditor && (
            <CollaboratorEditor
              splits={zapSplits}
              setSplits={setZapSplits}
              onClose={() => setShowCollaboratorEditor(false)}
            />
          )}

          {/* Media Previews */}
          {mediaFiles.length > 0 && (
            <div className={`grid gap-2 mb-3 ${mediaFiles.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
              {mediaFiles.map((file) => (
                <div key={file.url} className="relative rounded-2xl overflow-hidden group border border-gray-100 dark:border-gray-800">
                  {file.type.startsWith("image/") ? (
                    <img src={file.url} alt="Uploaded" className="w-full h-48 object-cover" />
                  ) : (
                    <video src={file.url} className="w-full h-48 object-cover" />
                  )}
                  <button
                    onClick={() => removeMedia(file.url)}
                    className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-50 dark:border-gray-900">
            <div className="flex items-center -ml-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/*,video/*"
                multiple
              />
              <button
                type="button"
                onClick={handleFileClick}
                disabled={isUploading}
                className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors disabled:opacity-50"
                title="Add media"
              >
                {isUploading ? <Loader2 className="animate-spin" size={20} /> : <ImageIcon size={20} />}
              </button>
              
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className={`p-2 rounded-full transition-colors ${
                  showEmojiPicker ? "bg-blue-500 text-white" : "text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                }`}
                title="Add emoji"
              >
                <Smile size={20} />
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowPollEditor(!showPollEditor);
                  if (!showPollEditor) setShowCollaboratorEditor(false);
                }}
                className={`p-2 rounded-full transition-colors ${
                  showPollEditor ? "bg-blue-500 text-white" : "text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                }`}
                title="Poll"
              >
                <BarChart2 size={20} />
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowCollaboratorEditor(!showCollaboratorEditor);
                  if (!showCollaboratorEditor) setShowPollEditor(false);
                }}
                className={`p-2 rounded-full transition-colors ${
                  showCollaboratorEditor ? "bg-purple-500 text-white" : "text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                }`}
                title="Add Collaborator (Zap Split)"
              >
                <Users size={20} />
              </button>
            </div>

            {/* Emoji Picker Overlay */}
            {showEmojiPicker && (
              <div className="absolute z-50 mt-12 p-4 bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-xl max-w-xs animate-in zoom-in-95">
                <div className="flex items-center justify-between mb-3 border-b border-gray-50 dark:border-gray-900 pb-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Custom Emojis</span>
                  <button onClick={() => setShowEmojiPicker(false)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
                </div>
                <div className="grid grid-cols-5 gap-2 overflow-y-auto max-h-48">
                  {emojis.map((emoji) => (
                    <button
                      key={emoji.shortcode}
                      onClick={() => insertEmoji(emoji.shortcode)}
                      title={`:${emoji.shortcode}:`}
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-lg transition-all flex items-center justify-center"
                    >
                      <img src={emoji.url} alt={emoji.shortcode} className="w-6 h-6 object-contain" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handlePost}
              disabled={isPosting || isUploading || (!content.trim() && mediaFiles.length === 0)}
              className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white font-black rounded-full transition-all disabled:opacity-50 shadow-lg shadow-blue-500/20 flex items-center gap-2"
            >
              {isPosting ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
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
