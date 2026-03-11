"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

export function HashtagLink({ tag, className }: { tag: string; className?: string }) {
  return (
    <Link
      href={`/search?q=%23${tag}`}
      className={cn("text-primary hover:underline font-black transition-colors", className)}
      onClick={e => e.stopPropagation()}
    >
      #{tag}
    </Link>
  );
}
