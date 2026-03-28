"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { useNDK } from "@/hooks/useNDK";
import { useAuthStore } from "@/store/auth";
import { useUIStore } from "@/store/ui";
import { useRouter } from "next/navigation";
import { publishNostrifyArticle } from "@/lib/actions/nostrify-actions";
import { saveDraftWrap } from "@/lib/actions/drafts";
import { ArrowLeft, Loader2, Image as ImageIcon, Send, Eye, PenLine, Cloud, RotateCcw } from "lucide-react";
import { ArticleRenderer } from "@/components/article/ArticleRenderer";
import { MarkdownToolbar } from "@/components/article/MarkdownToolbar";
import { DraftsModal } from "@/components/article/DraftsModal";
import { type NostrEvent } from "@nostrify/types";
import Image from "next/image";
import { toNpub } from "@/lib/utils/nip19";

const LOCAL_DRAFT_KEY = "tellit-article-draft";

export default function NewArticlePage() {
  const { ndk, isReady, signer } = useNDK();
  const { user, isLoggedIn } = useAuthStore();
  const { addToast } = useUIStore();
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [image, setImage] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [isDraftsModalOpen, setIsDraftsModalOpen] = useState(false);

  // Load local draft on mount
  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_DRAFT_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.content || parsed.title) {
          setTitle(parsed.title || "");
          setSummary(parsed.summary || "");
          setImage(parsed.image || "");
          setContent(parsed.content || "");
          setTags(parsed.tags || "");
          addToast("Local draft restored!", "info");
        }
      } catch (e) {
        console.error("Failed to parse local draft", e);
      }
    }
  }, [addToast]);

  // Auto-save to local storage
  useEffect(() => {
    if (!title && !content && !summary && !image && !tags) return;
    
    const timer = setTimeout(() => {
      localStorage.setItem(LOCAL_DRAFT_KEY, JSON.stringify({
        title, summary, image, content, tags,
        updatedAt: Date.now()
      }));
    }, 1000);

    return () => clearTimeout(timer);
  }, [title, summary, image, content, tags]);

  const clearDraft = () => {
    if (confirm("Clear current draft?")) {
      setTitle("");
      setSummary("");
      setImage("");
      setContent("");
      setTags("");
      localStorage.removeItem(LOCAL_DRAFT_KEY);
    }
  };

  const selectCloudDraft = (draft: Partial<NostrEvent>) => {
    setTitle(draft.tags?.find((t: string[]) => t[0] === 'title')?.[1] || "");
    setSummary(draft.tags?.find((t: string[]) => t[0] === 'summary')?.[1] || "");
    setImage(draft.tags?.find((t: string[]) => t[0] === 'image')?.[1] || "");
    setContent(draft.content || "");
    setTags(draft.tags?.filter((t: string[]) => t[0] === 't').map((t: string[]) => t[1]).join(", ") || "");
    setIsDraftsModalOpen(false);
    addToast("Cloud draft loaded!", "success");
  };

  const handleCloudSync = async () => {
    if (!ndk || !title || !content) {
      addToast("Title and content are required for sync", "error");
      return;
    }

    setIsCloudSyncing(true);
    try {
      const slug = title.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      const identifier = slug || `article-${Date.now()}`;
      
      const draftEvent = {
        kind: 30023,
        content,
        tags: [
          ["title", title],
          ["summary", summary],
          ["image", image],
          ...tags.split(",").map(t => ["t", t.trim().toLowerCase()]).filter(t => t[1])
        ]
      };

      await saveDraftWrap(ndk, draftEvent, {
        identifier,
        kind: 30023,
        expiration: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60) // 90 days
      });

      addToast("Encrypted draft synced to relays!", "success");
    } catch (err) {
      console.error(err);
      addToast("Failed to sync to cloud. Relay or signer error.", "error");
    } finally {
      setIsCloudSyncing(false);
    }
  };

  const handlePublish = async (isDraft = false) => {
    if (!signer || !title || !content) {
      addToast("Signer, Title and content are required", "error");
      return;
    }

    if (isDraft) setIsSavingDraft(true);
    else setIsSubmitting(true);

    try {
      const tagList = tags.split(",").map(t => t.trim()).filter(Boolean);
      const slug = title.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      const d = slug || Date.now().toString();

      // Slug Validation
      if (!isDraft && ndk && user) {
        const filter = {
          kinds: [30023],
          authors: [user.pubkey],
          "#d": [d]
        };
        const existing = await ndk.fetchEvents(filter);
        if (existing.size > 0) {
          addToast("An article with this slug already exists. Try changing the title.", "error");
          setIsSubmitting(false);
          return;
        }
      }
      
      const success = await publishNostrifyArticle(content, signer, {
        title,
        summary,
        image,
        tags: tagList,
        d
      });
      
      if (success) {
        addToast(isDraft ? "Draft saved successfully!" : "Article published successfully!", "success");
        if (!isDraft) {
          localStorage.removeItem(LOCAL_DRAFT_KEY);
          router.push(`/${user?.npub || (user?.pubkey ? toNpub(user.pubkey) : '')}`);
        }
      } else {
        addToast("Failed to publish article", "error");
      }
    } catch (err) {
      console.error(err);
      addToast(isDraft ? "Failed to save draft" : "Failed to publish article", "error");
    } finally {
      setIsSubmitting(false);
      setIsSavingDraft(false);
    }
  };

  // Mock event for preview
  const mockEvent = useMemo((): NostrEvent => ({
    id: "preview",
    kind: 30023,
    content,
    pubkey: user?.pubkey || "",
    created_at: Math.floor(Date.now() / 1000),
    sig: "",
    tags: [
      ["title", title],
      ["summary", summary],
      ["image", image],
      ...tags.split(",").map(t => ["t", t.trim()]).filter(t => t[1])
    ]
  }), [content, user?.pubkey, title, summary, image, tags]);

  if (!isReady || !isLoggedIn) return null;

  return (
    <>
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.back()} 
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-full transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-black">Write Article</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={clearDraft}
            className="p-2 text-gray-500 hover:text-destructive transition-colors"
            title="Clear Draft"
          >
            <RotateCcw size={22} />
          </button>

          <button
            onClick={() => setPreviewMode(!previewMode)}
            className="p-2 text-gray-500 hover:text-blue-500 transition-colors"
            title={previewMode ? "Edit" : "Preview"}
          >
            {previewMode ? <PenLine size={22} /> : <Eye size={22} />}
          </button>

          <button
            onClick={() => setIsDraftsModalOpen(true)}
            className="p-2 text-gray-500 hover:text-purple-500 transition-colors"
            title="Cloud Drafts"
          >
            <Cloud size={22} />
          </button>

          <button
            onClick={handleCloudSync}
            disabled={isSubmitting || isSavingDraft || isCloudSyncing || !title || !content}
            className="px-4 py-2 bg-purple-100 dark:bg-purple-900/30 hover:bg-purple-200 dark:hover:bg-purple-900/50 text-purple-600 dark:text-purple-400 rounded-full font-black text-sm flex items-center gap-2 transition-all active:scale-95"
            title="Sync encrypted draft to relays (NIP-37)"
          >
            {isCloudSyncing ? <Loader2 className="animate-spin" size={18} /> : <Cloud size={18} />}
            <span>Sync</span>
          </button>

          <button
            onClick={() => handlePublish(false)}
            disabled={isSubmitting || isSavingDraft || isCloudSyncing || !title || !content}
            className="px-6 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-full font-black text-sm flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all active:scale-95"
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
            <span>Publish</span>
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto pb-20">
        {previewMode ? (
          <div className="p-6 sm:p-10 animate-in fade-in duration-300">
            {image && (
              <div className="w-full aspect-[21/9] rounded-3xl overflow-hidden mb-10 border border-gray-100 dark:border-gray-800 shadow-sm relative">
                <Image src={image} fill className="object-cover" alt="Hero" unoptimized />
              </div>
            )}
            <h1 className="text-4xl sm:text-5xl font-[900] mb-6 leading-tight">{title || "Untitled Article"}</h1>
            {summary && <p className="text-xl text-gray-500 italic mb-10 border-l-4 border-blue-500 pl-6">{summary}</p>}
            <ArticleRenderer content={content} event={mockEvent} />
          </div>
        ) : (
          <div className="p-6 space-y-8 animate-in fade-in duration-300">
            {/* Hero Image Input */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Hero Image URL</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
                  <ImageIcon size={20} />
                </div>
                <input
                  type="text"
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  placeholder="https://example.com/cover.jpg"
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl py-4 pl-12 pr-4 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                />
              </div>
            </div>

            {/* Title Input */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1 text-blue-500">Article Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a catchy title..."
                className="w-full bg-transparent text-4xl sm:text-5xl font-black placeholder-gray-200 dark:placeholder-gray-800 outline-none border-none focus:ring-0 p-0 leading-tight"
              />
            </div>

            {/* Summary Input */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Short Summary</label>
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="What is this article about? (optional)"
                rows={2}
                className="w-full bg-transparent text-xl text-gray-500 italic placeholder-gray-200 dark:placeholder-gray-800 outline-none border-none focus:ring-0 p-0 resize-none border-l-4 border-gray-100 dark:border-gray-900 pl-6"
              />
            </div>

            {/* Tags Input */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Tags (comma separated)</label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="nostr, bitcoin, life..."
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl py-3 px-4 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm"
              />
            </div>

            {/* Content Input */}
            <div className="space-y-4 pt-4">
              <div className="sticky top-[72px] z-10">
                <MarkdownToolbar 
                  content={content} 
                  setContent={setContent} 
                  textareaRef={textareaRef} 
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Content (Markdown)</label>
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Start writing your story... Use Markdown for formatting!"
                  className="w-full bg-transparent text-lg leading-relaxed placeholder-gray-200 dark:placeholder-gray-800 outline-none border-none focus:ring-0 p-0 min-h-[500px] resize-none"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {isDraftsModalOpen && (
        <DraftsModal 
          onSelect={selectCloudDraft} 
          onClose={() => setIsDraftsModalOpen(false)} 
        />
      )}
    </>
  );
}
