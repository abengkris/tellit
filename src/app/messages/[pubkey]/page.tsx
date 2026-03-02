"use client";

import React, { use, useState, useRef, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useChat } from "@/hooks/useChat";
import { useProfile } from "@/hooks/useProfile";
import { sendMessage } from "@/lib/actions/messages";
import { useNDK } from "@/hooks/useNDK";
import { useUIStore } from "@/store/ui";
import { ArrowLeft, Send, Loader2, Info } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { shortenPubkey, decodeNip19 } from "@/lib/utils/nip19";
import { format } from "date-fns";

export default function ChatPage({ params }: { params: Promise<{ pubkey: string }> }) {
  const { pubkey: rawPubkey } = use(params);
  const { id: hexPubkey } = decodeNip19(rawPubkey);
  const { messages, loading, user } = useChat(hexPubkey);
  const { profile } = useProfile(hexPubkey);
  const { ndk, messenger } = useNDK();
  const { addToast } = useUIStore();
  const router = useRouter();
  
  const [content, setContent] = useState("");
  const [isSending, setIsSubmitting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const displayName = profile?.name || profile?.displayName || shortenPubkey(hexPubkey);
  const avatar = profile?.picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${hexPubkey}`;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ndk || !messenger || !content.trim() || !user || isSending) return;

    setIsSubmitting(true);
    try {
      const recipient = ndk.getUser({ pubkey: hexPubkey });
      const success = await sendMessage(messenger, recipient, content);
      if (success) {
        setContent("");
      } else {
        addToast("Failed to send message", "error");
      }
    } catch (err) {
      addToast("Error sending message", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MainLayout>
      <div className="flex flex-col h-[calc(100vh-64px)] sm:h-screen relative bg-gray-50 dark:bg-black">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 flex items-center px-4 py-3 space-x-4">
          <button 
            onClick={() => router.push("/messages")} 
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-full transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-3 min-w-0">
            <Image
              src={avatar}
              width={36}
              height={32}
              className="w-9 h-9 rounded-full object-cover bg-gray-200"
              alt={displayName}
              unoptimized
            />
            <div className="min-w-0">
              <h1 className="font-black text-base truncate">{displayName}</h1>
              <p className="text-[10px] text-gray-500 font-mono truncate">@{shortenPubkey(hexPubkey)}</p>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="px-4 py-2 bg-blue-50/50 dark:bg-blue-900/5 border-b border-blue-100/50 dark:border-blue-900/20 flex items-center gap-2 text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">
          <Info size={12} />
          <span>End-to-end encrypted via NIP-17</span>
        </div>

        {/* Messages */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-4"
        >
          {loading && messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="animate-spin text-blue-500" size={32} />
            </div>
          ) : messages.length > 0 ? (
            <>
              {messages.map((msg, i) => {
                const isMe = msg.sender === user?.pubkey;
                const showDate = i === 0 || 
                  (msg.timestamp - messages[i-1].timestamp > 3600);

                return (
                  <div key={msg.id} className="flex flex-col">
                    {showDate && (
                      <div className="text-center my-6">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 bg-gray-100 dark:bg-gray-900 px-3 py-1 rounded-full">
                          {format(new Date(msg.timestamp * 1000), "MMM d, h:mm a")}
                        </span>
                      </div>
                    )}
                    <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                      <div 
                        className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-[15px] shadow-sm ${
                          isMe 
                            ? "bg-blue-500 text-white rounded-tr-none" 
                            : "bg-white dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-100 dark:border-gray-800 rounded-tl-none"
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                        <p className={`text-[9px] mt-1 text-right opacity-60 font-medium ${isMe ? "text-white" : "text-gray-500"}`}>
                          {format(new Date(msg.timestamp * 1000), "HH:mm")}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 max-w-xs mx-auto">
              <p className="font-bold text-lg text-gray-900 dark:text-white mb-2">No messages yet</p>
              <p className="text-sm">Start the conversation with {displayName}! Your messages are private and secure.</p>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-4 bg-white dark:bg-black border-t border-gray-100 dark:border-gray-800">
          <form onSubmit={handleSend} className="flex items-center gap-2">
            <div className="flex-1 relative">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(e);
                  }
                }}
                placeholder="Message..."
                className="w-full bg-gray-100 dark:bg-gray-900 border-none rounded-2xl py-3 px-4 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all resize-none max-h-32"
                rows={1}
              />
            </div>
            <button
              type="submit"
              disabled={!content.trim() || isSending}
              className="p-3 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-full transition-all shadow-lg shadow-blue-500/20 active:scale-95 shrink-0"
            >
              {isSending ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} fill="currentColor" />}
            </button>
          </form>
        </div>
      </div>
    </MainLayout>
  );
}
