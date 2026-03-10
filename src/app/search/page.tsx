import { Suspense } from "react";
import { Metadata } from "next";
import { SearchContent } from "./SearchContent";
import { Search } from "lucide-react";

export const metadata: Metadata = {
  title: "Search",
  description: "Search for people, posts, and hashtags on Tell it!",
};

export default function SearchPage() {
  return (
    <Suspense fallback={
      <>
        <div className="sticky top-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur-md p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
              <Search className="h-5 w-5" />
            </div>
            <div className="block w-full h-12 border border-gray-100 dark:border-gray-800 rounded-2xl bg-gray-50 dark:bg-gray-900 animate-pulse" />
          </div>
        </div>
        <div className="p-8 text-center animate-pulse">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 dark:bg-gray-900 rounded-3xl mb-6" />
          <div className="h-8 bg-gray-100 dark:bg-gray-900 rounded w-1/3 mx-auto mb-2" />
          <div className="h-4 bg-gray-50 dark:bg-black rounded w-1/2 mx-auto" />
        </div>
      </>
    }>
      <SearchContent />
    </Suspense>
  );
}
