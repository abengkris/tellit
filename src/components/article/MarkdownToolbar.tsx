"use client";

import React, { useRef } from "react";
import { 
  Bold, 
  Italic, 
  Link as LinkIcon, 
  Image as ImageIcon, 
  Quote, 
  Heading1, 
  Heading2, 
  List, 
  ListOrdered, 
  Code,
  Loader2
} from "lucide-react";
import { useBlossom } from "@/hooks/useBlossom";
import { useUIStore } from "@/store/ui";

interface MarkdownToolbarProps {
  content: string;
  setContent: (content: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

export function MarkdownToolbar({ content, setContent, textareaRef }: MarkdownToolbarProps) {
  const { uploadFile } = useBlossom();
  const { addToast } = useUIStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = React.useState(false);

  const insertText = (before: string, after: string = "", placeholder: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end) || placeholder;
    
    const newText = 
      content.substring(0, start) + 
      before + selectedText + after + 
      content.substring(end);
    
    setContent(newText);
    
    // Reset focus and selection
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + before.length,
        start + before.length + selectedText.length
      );
    }, 0);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const result = await uploadFile(file);
      if (result && result.url) {
        insertText(`![${file.name}](${result.url})`, "", "");
        addToast("Image uploaded and inserted!", "success");
      }
    } catch (err) {
      console.error(err);
      addToast("Failed to upload image", "error");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const tools = [
    { icon: Heading1, label: "H1", action: () => insertText("# ", "", "Heading 1") },
    { icon: Heading2, label: "H2", action: () => insertText("## ", "", "Heading 2") },
    { icon: Bold, label: "Bold", action: () => insertText("**", "**", "bold text") },
    { icon: Italic, label: "Italic", action: () => insertText("_", "_", "italic text") },
    { icon: Quote, label: "Quote", action: () => insertText("> ", "", "quote") },
    { icon: List, label: "Bullet List", action: () => insertText("- ", "", "item") },
    { icon: ListOrdered, label: "Numbered List", action: () => insertText("1. ", "", "item") },
    { icon: Code, label: "Code", action: () => insertText("`", "`", "code") },
    { icon: LinkIcon, label: "Link", action: () => insertText("[", "](https://)", "link text") },
  ];

  return (
    <div className="flex items-center gap-1 p-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-x-auto no-scrollbar">
      {tools.map((tool, i) => (
        <button
          key={i}
          onClick={tool.action}
          className="p-2 hover:bg-white dark:hover:bg-gray-800 rounded-xl transition-all text-gray-500 hover:text-blue-500 active:scale-95 shrink-0"
          title={tool.label}
        >
          <tool.icon size={18} />
        </button>
      ))}
      
      <div className="w-px h-6 bg-gray-200 dark:bg-gray-800 mx-1 shrink-0" />
      
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="p-2 hover:bg-white dark:hover:bg-gray-800 rounded-xl transition-all text-gray-500 hover:text-blue-500 active:scale-95 shrink-0"
        title="Upload Image (Blossom)"
      >
        {isUploading ? <Loader2 size={18} className="animate-spin text-blue-500" /> : <ImageIcon size={18} />}
      </button>

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleImageUpload} 
        className="hidden" 
        accept="image/*"
      />
    </div>
  );
}
