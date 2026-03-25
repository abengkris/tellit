import Link from "next/link";
import { Search, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center animate-in fade-in zoom-in duration-500">
      <div className="bg-muted p-8 rounded-[2.5rem] mb-8 border border-border shadow-xl">
        <Search size={64} className="text-muted-foreground/50" />
      </div>
      
      <h2 className="text-3xl font-black mb-3 tracking-tighter">Page not found</h2>
      
      <p className="text-muted-foreground mb-10 max-w-md font-medium leading-relaxed">
        The page you are looking for doesn&apos;t exist or has been moved to a different decentralized relay.
      </p>

      <Button
        asChild
        size="lg"
        className="bg-primary hover:bg-primary/90 text-primary-foreground font-black px-10 rounded-2xl transition-all shadow-xl shadow-primary/20 gap-2 h-14"
      >
        <Link href="/">
          <Home size={20} />
          <span>Back to Home</span>
        </Link>
      </Button>
    </div>
  );
}
