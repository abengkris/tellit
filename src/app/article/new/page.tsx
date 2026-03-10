"use client";

import React, { useState } from "react";
import { useNDK } from "@/hooks/useNDK";
import { useAuthStore } from "@/store/auth";
import { useUIStore } from "@/store/ui";
import { useRouter } from "next/navigation";
import { publishArticle } from "@/lib/actions/post";
import { ArrowLeft, Loader2, Image as ImageIcon, Send, Eye, PenLine } from "lucide-react";
import { ArticleRenderer } from "@/components/article/ArticleRenderer";
import { NDKEvent } from "@nostr-dev-kit/ndk";
import Image from "next/image";

export default function NewArticlePage() {
  const { ndk, isReady } = useNDK();
  const { user, isLoggedIn } = useAuthStore();
  const { addToast } = useUIStore();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [image, setImage] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  const handlePublish = async () => {
    if (!ndk || !title || !content) {
      addToast("Title and content are required", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const tagList = tags.split(",").map(t => t.trim()).filter(Boolean);
      await publishArticle(ndk, content, {
        title,
        summary,
        image,
        tags: tagList
      });
      addToast("Article published successfully!", "success");
      router.push(`/${user?.npub}`);
    } catch (err) {
      console.error(err);
      addToast("Failed to publish article", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isReady || !isLoggedIn) return null;

  // Mock event for preview
  const mockEvent = new NDKEvent(ndk || undefined);
  mockEvent.kind = 30023;
  mockEvent.content = content;
  mockEvent.pubkey = user?.pubkey || "";
  mockEvent.tags = [
    ["title", title],
    ["summary", summary],
    ["image", image],
    ...tags.split(",").map(t => ["t", t.trim()]).filter(t => t[1])
  ];

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
            onClick={() => setPreviewMode(!previewMode)}
            className="p-2 text-gray-500 hover:text-blue-500 transition-colors"
            title={previewMode ? "Edit" : "Preview"}
          >
            {previewMode ? <PenLine size={22} /> : <Eye size={22} />}
          </button>
          <button
            onClick={handlePublish}
            disabled={isSubmitting || !title || !content}
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
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Content (Markdown)</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Start writing your story... Use Markdown for formatting!"
                className="w-full bg-transparent text-lg leading-relaxed placeholder-gray-200 dark:placeholder-gray-800 outline-none border-none focus:ring-0 p-0 min-h-[400px] resize-none"
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
