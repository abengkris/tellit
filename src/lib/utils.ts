import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getReadingTime(content: string): number {
  const wordsPerMinute = 200;
  // Remove basic markdown formatting to get a cleaner word count
  const cleanContent = content.replace(/[#*`_\[\]()]/g, '');
  const words = cleanContent.trim().split(/\s+/).length;
  return Math.ceil(words / wordsPerMinute);
}
