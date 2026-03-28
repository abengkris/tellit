"use client";

import React, { useState, useRef, useEffect } from "react";
import { useAuthStore } from "@/store/auth";
import { useNDK } from "@/hooks/useNDK";
import { ZapSplit } from "@/lib/actions/post";
import { buildPostTemplate } from "@/lib/actions/nostrify-post";
import { useNostrifyPublish } from "@/hooks/useNostrifyPublish";
import { createPoll, PollOption } from "@/lib/actions/poll";
import { saveDraftWrap } from "@/lib/actions/drafts";
import { useUIStore } from "@/store/ui";
import { useEmojis } from "@/hooks/useEmojis";
import { useInteractionHistory } from "@/hooks/useInteractionHistory";
import { useDrafts } from "@/hooks/useDrafts";
import { useProfile } from "@/hooks/useProfile";
import { NDKEvent, NDKTag, nip19 } from "@nostr-dev-kit/ndk";
import Image from "next/image";
import { 
  ImageIcon, 
  Smile,
  X, 
  Loader2, 
  BarChart2,
  Users,
  Type,
  Languages,
  Cloud,
  ShieldAlert
} from "lucide-react";
import { Avatar } from "../common/Avatar";
import { PollEditor } from "./PollEditor";
import { CollaboratorEditor } from "./CollaboratorEditor";
import { useMentionSearch } from "@/hooks/useMentionSearch";
import { uploadToBlossom, formatImeta, getTagValue } from "@/lib/upload";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

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
  const { recordInteraction } = useInteractionHistory();
  const { emojis } = useEmojis();
  const { profile } = useProfile(user?.pubkey);
  
  // Create a unique key for the draft
  const draftKey = replyTo ? `reply-${replyTo.id}` : quoteEvent ? `quote-${quoteEvent.id}` : 'main-composer';
  const { draft, updateDraft, clearDraft, isLoaded } = useDrafts(draftKey);

  const [content, setContent] = useState("");
  const [subject, setSubject] = useState("");
  const [showSubject, setShowSubject] = useState(false);
  const [contentWarning, setContentWarning] = useState("");
  const [showContentWarning, setShowContentWarning] = useState(false);
  const [language, setLanguage] = useState<string>("");
  const [isPosting, setIsPosting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showPollEditor, setShowPollEditor] = useState(false);
  const [showCollaboratorEditor, setShowCollaboratorEditor] = useState(false);
  
  // Mention state
  const [mentionQuery, setMentionQuery] = useState("");
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [cursorPos, setCursorPos] = useState(0);
  const { results: mentionResults } = useMentionSearch(mentionQuery);
  const { publish } = useNostrifyPublish();
  
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

  const handleCloudSync = async () => {
    if (!ndk || !content.trim()) {
      addToast("Content is required for sync", "error");
      return;
    }

    setIsCloudSyncing(true);
    try {
      const identifier = draftKey;

      // Draft event structure for kind 1
      const draftEvent = {
        kind: 1,
        content,
        tags: [] as NDKTag[]
      };

      if (replyTo) {
        draftEvent.tags.push(["e", replyTo.id, "", "reply"]);
      }

      await saveDraftWrap(ndk, draftEvent, {
        identifier,
        kind: 1,
        expiration: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60) // 90 days
      });

      addToast("Encrypted draft synced to relays!", "success");
    } catch (err) {
      console.error(err);
      addToast("Failed to sync to cloud", "error");
    } finally {
      setIsCloudSyncing(false);
    }
  };

  const insertMention = (npub?: string, pubkey?: string) => {
    const mention = npub || (pubkey ? nip19.npubEncode(pubkey) : "");
    if (!mention) return;

    const lastAt = content.lastIndexOf("@", cursorPos - 1);
    if (lastAt !== -1) {
      const before = content.slice(0, lastAt);
      const after = content.slice(cursorPos);
      const newContent = `${before}nostr:${mention} ${after}`;
      setContent(newContent);
      setShowMentionPicker(false);
      setTimeout(() => {
        textareaRef.current?.focus();
        const newPos = before.length + mention.length + 7; // nostr: + space
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
        let pollSubject = (showSubject && subject.trim()) ? subject.trim() : undefined;
        
        // Inherit subject if it's a reply and no subject provided
        if (!pollSubject && replyTo) {
          const parentSubject = replyTo.tags.find(t => t[0] === 'subject')?.[1];
          if (parentSubject) {
            pollSubject = parentSubject.startsWith("Re: ") ? parentSubject : `Re: ${parentSubject}`;
          }
        }

        const tags: NDKTag[] = [];
        
        // Add quote tag (NIP-18)
        if (quoteEvent) {
          const relayUrl = quoteEvent.onRelays?.[0]?.url || "";
          tags.push(["q", quoteEvent.id, relayUrl, quoteEvent.pubkey]);
          
          const nostrUri = quoteEvent.encode();
          if (!finalContent.includes(nostrUri)) {
            finalContent += `\n\nnostr:${nostrUri}`;
          }
        }

        // Automatic Quote tags from NIP-21 entities in content (nostr:nevent, nostr:note, nostr:naddr)
        const nip21Regex = /nostr:((?:nevent1|note1|naddr1)[0-9a-z]+)/gi;
        const nip21Matches = [...finalContent.matchAll(nip21Regex)];
        
        for (const match of nip21Matches) {
          const bech32 = match[1];
          try {
            const decoded = nip19.decode(bech32);
            let targetId = "";
            let pubkey = "";
            let relay = "";

            if (decoded.type === 'nevent') {
              targetId = decoded.data.id;
              pubkey = decoded.data.author || "";
              relay = decoded.data.relays?.[0] || "";
            } else if (decoded.type === 'note') {
              targetId = decoded.data as string;
            } else if (decoded.type === 'naddr') {
              const d = decoded.data;
              targetId = `${d.kind}:${d.pubkey}:${d.identifier}`;
              pubkey = d.pubkey;
              relay = d.relays?.[0] || "";
            }

            if (targetId && !tags.some(t => t[0] === 'q' && t[1] === targetId)) {
              tags.push(["q", targetId, relay, pubkey]);
            }
          } catch {
            // Ignore invalid bech32
          }
        }

        // Add reply tags (NIP-10)
        if (replyTo) {
          const rootTag = replyTo.tags.find((t) => t[0] === "e" && t[3] === "root");
          const rootId = rootTag ? rootTag[1] : replyTo.id;
          tags.push(["e", rootId, "", "root"]);
          if (rootId !== replyTo.id) {
            tags.push(["e", replyTo.id, "", "reply"]);
          }
          tags.push(["p", replyTo.pubkey]);
        }

        event = await createPoll(ndk, finalContent, {
          options: validOptions,
          endsAt: Math.floor(Date.now() / 1000) + 86400, // 24h default
          subject: pollSubject,
          tags
        });
      } else {
        const tags: NDKTag[] = [];
        // Add imeta tags for Blossom media (NIP-92)
        mediaFiles.forEach(file => {
          if (file.imeta) {
            tags.push(file.imeta);
          }
        });

        // Add emoji tags (NIP-30)
        // Extract :shortcodes: from content
        const shortcodeRegex = /:(\w+):/g;
        const shortcodesInContent = [...finalContent.matchAll(shortcodeRegex)].map(m => m[1]);
        
        // Add tags for each unique shortcode found
        const uniqueShortcodes = new Set(shortcodesInContent);
        uniqueShortcodes.forEach(code => {
          const emoji = emojis.find(e => e.shortcode === code);
          if (emoji) {
            tags.push(["emoji", emoji.shortcode, emoji.url]);
          }
        });

        const options = {
          replyTo,
          quoteEvent,
          tags,
          zapSplits,
          subject: (showSubject && subject.trim()) ? subject.trim() : undefined,
          labels: language ? [{ namespace: "ISO-639-1", label: language }] : undefined,
          contentWarning: showContentWarning ? contentWarning.trim() : undefined
        };

        const template = buildPostTemplate(finalContent, options);
        const signedEvent = await publish(template);
        event = new NDKEvent(ndk, signedEvent);
      }

      if (event) {
        addToast(showPollEditor ? "Poll published!" : "Posted successfully!", "success");
        
        // Record interaction for local feed scoring
        if (replyTo) recordInteraction(replyTo.pubkey, 2);
        if (quoteEvent) recordInteraction(quoteEvent.pubkey, 2);

        setContent("");
        setSubject("");
        setShowSubject(false);
        setContentWarning("");
        setShowContentWarning(false);
        setLanguage("");
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
        if (!ndk) continue;
        const tags = await uploadToBlossom(ndk, file);
        const url = getTagValue(tags, "url");
        
        if (url) {
          setMediaFiles(prev => [...prev, { 
            url, 
            type: file.type,
            imeta: formatImeta(tags) as NDKTag
          }]);
        }
      }
      addToast("Media uploaded with metadata!", "success");
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
    <div className={cn("p-4", !replyTo && "border-b border-border")}>
      <div className="flex gap-3">
        <Avatar 
          pubkey={user?.pubkey || ""} 
          src={profile?.picture || (profile as { image?: string })?.image} 
          size={48} 
          nip05={profile?.nip05}
          aria-hidden="true"
        />
        
        <div className="flex-1 min-w-0 relative">
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={handleContentChange}
            onClick={() => setCursorPos(textareaRef.current?.selectionStart || 0)}
            onKeyUp={() => setCursorPos(textareaRef.current?.selectionStart || 0)}
            placeholder={placeholder}
            aria-label={placeholder}
            autoFocus={autoFocus}
            rows={3}
            className="w-full bg-transparent text-lg resize-none border-none focus-visible:ring-0 placeholder:text-muted-foreground py-2 shadow-none min-h-[100px]"
          />

          {showSubject && (
            <div className="mb-4 animate-in slide-in-from-top-2 duration-200">
              <Input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject (optional)"
                className="w-full bg-muted/30 border border-border rounded-lg h-10 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                maxLength={80}
              />
            </div>
          )}

          {showContentWarning && (
            <div className="mb-4 animate-in slide-in-from-top-2 duration-200 relative">
              <ShieldAlert className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-amber-500" />
              <Input
                type="text"
                value={contentWarning}
                onChange={(e) => setContentWarning(e.target.value)}
                placeholder="Content warning / NSFW reason (optional)"
                className="w-full bg-amber-500/10 text-amber-600 dark:text-amber-500 text-sm font-bold border-none h-10 pl-9 rounded-lg focus-visible:ring-1 focus-visible:ring-amber-500/50 placeholder:text-amber-500/50"
                maxLength={80}
              />
            </div>
          )}

          {showMentionPicker && mentionResults.length > 0 && (
            <Card className="absolute z-50 mt-1 w-64 shadow-2xl border-border overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <CardContent className="p-0 max-h-48 overflow-y-auto">
                {mentionResults.map((u, i) => (
                  <React.Fragment key={u.pubkey}>
                    <Button
                      variant="ghost"
                      onClick={() => insertMention(u.npub, u.pubkey)}
                      className="w-full justify-start h-auto px-4 py-3 rounded-none gap-3 hover:bg-accent"
                    >
                      <Avatar pubkey={u.pubkey} size={32} nip05={u.profile?.nip05} aria-hidden="true" />
                      <div className="min-w-0 text-left">
                        <div className="font-bold text-sm truncate">{u.profile?.display_name || u.profile?.name}</div>
                        <div className="text-xs text-muted-foreground truncate">@{u.profile?.name}</div>
                      </div>
                    </Button>
                    {i < mentionResults.length - 1 && <Separator />}
                  </React.Fragment>
                ))}
              </CardContent>
            </Card>
          )}

          {showPollEditor && (
            <div className="mt-2 mb-4 animate-in slide-in-from-top-2 duration-200">
              <PollEditor 
                options={pollOptions} 
                setOptions={setPollOptions} 
                onClose={() => setShowPollEditor(false)} 
              />
            </div>
          )}

          {showCollaboratorEditor && (
            <div className="mt-2 mb-4 animate-in slide-in-from-top-2 duration-200">
              <CollaboratorEditor
                splits={zapSplits}
                setSplits={setZapSplits}
                onClose={() => setShowCollaboratorEditor(false)}
              />
            </div>
          )}

          {/* Media Previews */}
          {mediaFiles.length > 0 && (
            <div className={cn("grid gap-2 mb-4 mt-2", mediaFiles.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
              {mediaFiles.map((file) => (
                <div key={file.url} className="relative rounded-2xl overflow-hidden group border border-border aspect-video bg-muted/30">
                  {file.type.startsWith("image/") ? (
                    <Image 
                      src={file.url} 
                      alt="Uploaded media" 
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover transition-transform group-hover:scale-105 duration-500" 
                    />
                  ) : (
                    <video src={file.url} className="w-full h-full object-cover" />
                  )}
                  <Button
                    variant="destructive"
                    size="icon-xs"
                    onClick={() => removeMedia(file.url)}
                    className="absolute top-2 right-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Remove media"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center justify-between pt-3 border-t border-border">
            <div className="flex items-center -ml-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/*,video/*"
                multiple
              />
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleFileClick}
                    disabled={isUploading}
                    className="text-primary hover:bg-primary/10 rounded-full"
                    aria-label="Add media"
                  >
                    {isUploading ? <Loader2 className="size-5 animate-spin" /> : <ImageIcon className="size-5" aria-hidden="true" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Add media</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant={showEmojiPicker ? "secondary" : "ghost"}
                    size="icon"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className={cn("text-primary hover:bg-primary/10 rounded-full", showEmojiPicker && "bg-primary/10")}
                    aria-label="Add emoji"
                  >
                    <Smile className="size-5" aria-hidden="true" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Add emoji</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant={showSubject ? "secondary" : "ghost"}
                    size="icon"
                    onClick={() => {
                      setShowSubject(!showSubject);
                      if (!showSubject && replyTo) {
                        const parentSubject = replyTo.tags.find(t => t[0] === 'subject')?.[1];
                        if (parentSubject) {
                          setSubject(parentSubject.startsWith("Re: ") ? parentSubject : `Re: ${parentSubject}`);
                        }
                      }
                    }}
                    className={cn("text-primary hover:bg-primary/10 rounded-full", showSubject && "bg-primary/10")}
                    aria-label="Add subject"
                  >
                    <Type className="size-5" aria-hidden="true" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Add subject</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant={showContentWarning ? "secondary" : "ghost"}
                    size="icon"
                    onClick={() => setShowContentWarning(!showContentWarning)}
                    className={cn("text-amber-500 hover:bg-amber-500/10 rounded-full", showContentWarning && "bg-amber-500/10")}
                    aria-label="Add content warning"
                  >
                    <ShieldAlert className="size-5" aria-hidden="true" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Add content warning (NSFW)</TooltipContent>
              </Tooltip>

              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant={language ? "secondary" : "ghost"}
                        size="icon"
                        className={cn("text-primary hover:bg-primary/10 rounded-full", language && "bg-primary/10")}
                        aria-label="Select language"
                      >
                        <Languages className="size-5" aria-hidden="true" />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    {language ? `Language: ${language.toUpperCase()}` : "Select language"}
                  </TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="start" className="w-40 font-black uppercase tracking-widest text-[10px]">
                  <DropdownMenuItem onClick={() => setLanguage("")}>
                    Auto / None
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setLanguage("id")}>
                    Indonesian (ID)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLanguage("en")}>
                    English (EN)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLanguage("ja")}>
                    Japanese (JA)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleCloudSync}
                    disabled={isPosting || isUploading || isCloudSyncing}
                    className="text-primary hover:bg-primary/10 rounded-full"
                    aria-label="Sync draft to cloud"
                  >
                    {isCloudSyncing ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : <Cloud className="size-5" aria-hidden="true" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Sync encrypted draft to relays (NIP-37)</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant={showPollEditor ? "secondary" : "ghost"}
                    size="icon"
                    onClick={() => {
                      setShowPollEditor(!showPollEditor);
                      if (!showPollEditor) setShowCollaboratorEditor(false);
                    }}
                    className={cn("text-primary hover:bg-primary/10 rounded-full", showPollEditor && "bg-primary/10")}
                    aria-label="Add poll"
                  >
                    <BarChart2 className="size-5" aria-hidden="true" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Add poll</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant={showCollaboratorEditor ? "secondary" : "ghost"}
                    size="icon"
                    onClick={() => {
                      setShowCollaboratorEditor(!showCollaboratorEditor);
                      if (!showCollaboratorEditor) setShowPollEditor(false);
                    }}
                    className={cn("text-purple-500 hover:bg-purple-500/10 rounded-full", showCollaboratorEditor && "bg-purple-500/10")}
                    aria-label="Add collaborator (zap split)"
                  >
                    <Users className="size-5" aria-hidden="true" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Zap split</TooltipContent>
              </Tooltip>
            </div>

            {/* Emoji Picker Overlay */}
            {showEmojiPicker && (
              <Card className="absolute z-50 mt-12 w-72 shadow-2xl border-border animate-in zoom-in-95 duration-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3 border-b border-border pb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Custom Emojis</span>
                    <Button variant="ghost" size="icon-xs" onClick={() => setShowEmojiPicker(false)} aria-label="Close emoji picker">
                      <X className="size-3" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-5 gap-2 overflow-y-auto max-h-48 pr-1">
                    {emojis.map((emoji) => (
                      <Button
                        key={emoji.shortcode}
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => insertEmoji(emoji.shortcode)}
                        className="hover:bg-accent rounded-lg p-1 h-auto w-auto"
                        title={`:${emoji.shortcode}:`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={emoji.url} alt={emoji.shortcode} className="size-6 object-contain" />
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Button
              onClick={handlePost}
              loading={isPosting}
              disabled={isUploading || (!content.trim() && mediaFiles.length === 0)}
              className="px-8 rounded-full font-black shadow-lg shadow-primary/20 gap-2 h-10"
            >
              {replyTo ? "Reply" : quoteEvent ? "Quote" : "Post"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
