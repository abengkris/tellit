"use client";

import React, { useState, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { NDKEvent } from "@nostr-dev-kit/ndk";
import { type NostrEvent } from "@nostrify/types";
import Link from "next/link";
import { decodeNip19 } from "@/lib/utils/nip19";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Lightbox } from "@/components/common/Lightbox";

interface ArticleRendererProps {
  content: string;
  event: NDKEvent | NostrEvent;
}

export function ArticleRenderer({ content: rawContent }: ArticleRendererProps) {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [lightboxAlt, setLightboxAlt] = useState<string | undefined>(undefined);

  // Pre-parse content for inline NIP-27 mentions (nostr:npub1...)
  const content = useMemo(() => {
    const nostrRegex = /nostr:([a-zA-Z0-9]+)/g;
    return rawContent.replace(nostrRegex, (match, nip19) => {
      return `[${nip19}](${match})`;
    });
  }, [rawContent]);

  return (
    <div className="prose prose-lg dark:prose-invert prose-blue max-w-none 
      selection:bg-primary/20
      prose-headings:font-black prose-headings:tracking-tight prose-headings:text-foreground
      prose-p:leading-[1.8] prose-p:text-foreground/80 prose-p:mb-6
      prose-img:rounded-3xl prose-img:border prose-img:border-border prose-img:my-12
      prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none prose-code:font-black
      prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:bg-primary/5 prose-blockquote:py-2 prose-blockquote:px-8 prose-blockquote:rounded-r-3xl prose-blockquote:not-italic prose-blockquote:my-10
      prose-ul:list-disc prose-ul:pl-6 prose-li:mb-2
      prose-hr:hidden
    ">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Syntax Highlighting for Code Blocks
          code({ inline, className, children, ...props }: React.ComponentPropsWithoutRef<"code"> & { inline?: boolean; node?: unknown }) {
            const match = /language-(\w+)/.exec(className || "");
            return !inline && match ? (
              <div className="relative group rounded-2xl overflow-hidden my-6 border border-border shadow-sm">
                <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <Badge variant="secondary" className="text-[10px] font-black uppercase tracking-widest bg-muted/80 backdrop-blur-sm">
                    {match[1]}
                  </Badge>
                </div>
                <SyntaxHighlighter
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  style={oneDark as any}
                  language={match[1]}
                  PreTag="div"
                  customStyle={{
                    margin: 0,
                    padding: '1.5rem',
                    fontSize: '0.9rem',
                    backgroundColor: 'rgb(10, 10, 10)',
                  }}
                  {...props}
                >
                  {String(children).replace(/\n$/, "")}
                </SyntaxHighlighter>
              </div>
            ) : (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
          // Custom Link Handling (including nostr: URIs)
          a: ({ href, children, ...props }) => {
            if (!href) return <span>{children}</span>;

            // Handle Nostr Links
            if (href.startsWith("nostr:") || href.startsWith("web+nostr:")) {
              const raw = href.replace(/^(web\+)?nostr:/, "");
              try {
                const { kind } = decodeNip19(raw);
                
                let targetUrl = `/post/${raw}`; // Default
                if (raw.startsWith("npub1") || raw.startsWith("nprofile1")) {
                  targetUrl = `/${raw}`;
                } else if (raw.startsWith("naddr1") || kind === 30023) {
                  targetUrl = `/article/${raw}`;
                }

                return (
                  <Link href={targetUrl} className="text-primary hover:underline font-black">
                    {children}
                  </Link>
                );
              } catch {
                return <span className="text-destructive underline">{children}</span>;
              }
            }

            // External Links
            return (
              <a 
                href={href} 
                className="text-primary hover:underline font-black decoration-primary/30 underline-offset-4 transition-all hover:decoration-primary" 
                target="_blank" 
                rel="noopener noreferrer" 
                {...props}
              >
                {children}
              </a>
            );
          },
          // Responsive Images & Videos
          img: ({ src, alt, ...props }) => {
            if (!src) return null;
            
            const isVideo = typeof src === 'string' && src.split('?')[0].split('#')[0].toLowerCase().match(/\.(mp4|webm|ogg|mov)$/);

            if (isVideo && typeof src === 'string') {
              return (
                <div className="my-10 flex flex-col items-center">
                  <video 
                    src={src} 
                    controls 
                    className="rounded-3xl shadow-2xl border border-border max-h-[70vh] w-full bg-black/5"
                  />
                  {alt && (
                    <span className="text-sm text-muted-foreground mt-4 font-black uppercase tracking-tight opacity-70 italic text-center">
                      {alt}
                    </span>
                  )}
                </div>
              );
            }

            return (
              <div className="my-8 flex flex-col items-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={src} 
                  alt={alt || ""} 
                  className="rounded-3xl shadow-xl border border-border max-h-[70vh] object-contain transition-transform hover:scale-[1.01] cursor-zoom-in" 
                  loading="lazy"
                  onClick={() => {
                    if (typeof src === 'string') {
                      setLightboxSrc(src);
                      setLightboxAlt(alt);
                    }
                  }}
                  {...props} 
                />
                {alt && (
                  <span className="text-sm text-muted-foreground mt-4 font-black uppercase tracking-tight opacity-70 italic">
                    {alt}
                  </span>
                )}
              </div>
            );
          },
          // Better Headings
          h1: ({ children }) => <h1 className="text-4xl mt-16 mb-8">{children}</h1>,
          h2: ({ children }) => (
            <div className="mt-14 mb-6">
              <h2 className="text-3xl pb-2 border-none">{children}</h2>
              <Separator className="bg-primary/20 h-1 rounded-full w-20" />
            </div>
          ),
          h3: ({ children }) => <h3 className="text-2xl mt-10 mb-4">{children}</h3>,
          hr: () => <Separator className="my-16 opacity-50" />
        }}
      >
        {content}
      </ReactMarkdown>

      <Lightbox 
        media={lightboxSrc ? [{ url: lightboxSrc, type: "image", alt: lightboxAlt }] : []} 
        isOpen={!!lightboxSrc} 
        onClose={() => setLightboxSrc(null)} 
      />
    </div>
  );
}
