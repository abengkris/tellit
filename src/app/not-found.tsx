import Link from "next/link";
import { Search } from "lucide-react";

export default function NotFound() {
  return (
    <>
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
        <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-full mb-6">
          <Search size={48} className="text-gray-400" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Page Not Found</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md">
          The page you are looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-8 rounded-2xl transition-all shadow-lg shadow-blue-500/20"
        >
          Go Home
        </Link>
      </div>
    </>
  );
}
