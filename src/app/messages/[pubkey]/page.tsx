"use client";

import React, { use, useState, useRef, useEffect } from "react";
import { useChat } from "@/hooks/useChat";
import { useProfile } from "@/hooks/useProfile";
import { useNDK } from "@/hooks/useNDK";
import { useAuthStore } from "@/store/auth";
import { useUIStore } from "@/store/ui";
import { useBlossom } from "@/hooks/useBlossom";
import { useEmojis } from "@/hooks/useEmojis";
import { sendMessage, publishReadReceipt } from "@/lib/actions/messages";
import { ArrowLeft, Send, Loader2, Image as ImageIcon, Smile, X } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/common/Avatar";
import { MessageBubbleContent } from "@/components/common/MessageBubbleContent";
import { decodeNip19 } from "@/lib/utils/nip19";

export default function ChatPage({ params }: { params: Promise<{ pubkey: string }> }) {
  const { pubkey } = use(params);
  const { messenger, ndk } = useNDK();
  const { user: currentUser } = useAuthStore();
  const { addToast } = useUIStore();
  const { uploadFile } = useBlossom();
  const { emojis } = useEmojis();
  const { messages, loading, sendMessage: sendMsg, markAsRead } = useChat(pubkey);
  const { profile } = useProfile(pubkey);
  
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const hexPubkey = decodeNip19(pubkey).id;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle read receipts (Kind 15) specifically, useChat already handles conv.markAsRead()
  useEffect(() => {
    if (ndk && hexPubkey && messages.length > 0) {
      const recipientUser = ndk.getUser({ pubkey: hexPubkey });
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.sender === hexPubkey) {
        publishReadReceipt(lastMsg.event, recipientUser);
      }
    }
  }, [ndk, hexPubkey, messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const success = await sendMsg(content);
      if (success) {
        setContent("");
        setShowEmojiPicker(false);
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const result = await uploadFile(file);
      if (result && result.url) {
        setContent(prev => {
          const separator = prev && !prev.endsWith("\n") ? "\n" : "";
          return `${prev}${separator}${result.url}`;
        });
        addToast("Media uploaded!", "success");
        inputRef.current?.focus();
      }
    } catch (err) {
      console.error("DM Upload failed:", err);
      addToast("Failed to upload media.", "error");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const insertEmoji = (shortcode: string) => {
    setContent(prev => {
      const lastChar = prev.slice(-1);
      const prefix = lastChar === " " || lastChar === "" ? "" : " ";
      return `${prev}${prefix}:${shortcode}: `;
    });
    inputRef.current?.focus();
  };

  if (loading && messages.length === 0) {
    return (
      <>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="animate-spin text-blue-500" size={32} />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="flex flex-col h-[calc(100vh-64px)] lg:h-screen">
        {/* Header */}
        <div className="flex items-center p-4 border-b border-gray-100 dark:border-gray-800 bg-white/80 dark:bg-black/80 backdrop-blur-md sticky top-0 z-10">
          <Link href="/messages" className="mr-4 lg:hidden">
            <ArrowLeft size={24} />
          </Link>
          <Link href={`/${pubkey}`} className="flex items-center flex-1 min-w-0">
            <Avatar pubkey={hexPubkey} src={profile?.picture} size={40} className="mr-3" />
            <div className="min-w-0">
              <h2 className="font-bold truncate">
                {profile?.display_name || profile?.name || "Unknown"}
              </h2>
              {profile?.nip05 && (
                <p className="text-xs text-gray-500 truncate">{profile.nip05}</p>
              )}
            </div>
          </Link>
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, i) => {
            const isMe = msg.sender === currentUser?.pubkey;
            const prevMsg = messages[i - 1];
            const showTime = !prevMsg || msg.timestamp - prevMsg.timestamp > 300; // 5 mins

            return (
              <div key={msg.id} className="flex flex-col">
                {showTime && (
                  <div className="text-center my-4">
                    <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">
                      {new Date(msg.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}
                <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                  <div 
                    className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2 ${
                      isMe 
                        ? "bg-blue-500 text-white rounded-tr-none shadow-sm shadow-blue-500/20" 
                        : "bg-gray-100 dark:bg-gray-800 rounded-tl-none border border-gray-200/50 dark:border-gray-700/50"
                    }`}
                  >
                    <MessageBubbleContent text={msg.content} event={msg.event} isMe={isMe} />
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Emoji Picker Overlay */}
        {showEmojiPicker && (
          <div className="p-4 bg-white dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800 animate-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Custom Emojis</span>
              <button onClick={() => setShowEmojiPicker(false)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
            </div>
            <div className="grid grid-cols-6 sm:grid-cols-10 gap-2 overflow-y-auto max-h-48">
              {emojis.map((emoji) => (
                <button
                  key={emoji.shortcode}
                  onClick={() => insertEmoji(emoji.shortcode)}
                  title={`:${emoji.shortcode}:`}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-xl transition-all flex items-center justify-center"
                >
                  <img src={emoji.url} alt={emoji.shortcode} className="w-6 h-6 object-contain" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-black">
          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept="image/*,video/*"
            />
            <div className="flex items-center">
              <button
                type="button"
                onClick={handleFileClick}
                disabled={isUploading || isSubmitting}
                className="p-2 text-gray-500 hover:text-blue-500 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-full transition-colors disabled:opacity-50"
                title="Upload media"
              >
                {isUploading ? <Loader2 className="animate-spin" size={20} /> : <ImageIcon size={20} />}
              </button>
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className={`p-2 rounded-full transition-colors ${
                  showEmojiPicker ? "bg-blue-500 text-white" : "text-gray-500 hover:text-blue-500 hover:bg-gray-100 dark:hover:bg-gray-900"
                }`}
                title="Emoji"
              >
                <Smile size={20} />
              </button>
            </div>
            
            <input
              ref={inputRef}
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Start a new message"
              className="flex-1 bg-gray-100 dark:bg-gray-900 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={!content.trim() || isSubmitting || isUploading}
              className="p-2 bg-blue-500 text-white rounded-full disabled:opacity-50 flex-shrink-0"
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} fill="currentColor" />}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
