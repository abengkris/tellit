import { Suspense, use } from "react";
import { Metadata } from "next";
import { ProfileContent } from "./ProfileContent";
import { decodeNip19, shortenPubkey } from "@/lib/utils/nip19";
import { connectNDK } from "@/lib/ndk";
import { FeedSkeleton } from "@/components/feed/FeedSkeleton";

interface Props {
  params: Promise<{ npub: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { npub } = await params;
  const { id: hexPubkey } = decodeNip19(npub);
  
  try {
    const ndk = await connectNDK();
    const user = ndk.getUser({ pubkey: hexPubkey });
    const profile = await user.fetchProfile();
    
    const display_name = profile?.display_name ? String(profile.display_name) : (profile?.name ? String(profile.name) : shortenPubkey(npub));
    const about = profile?.about || `Check out ${display_name}'s profile on Tell it!`;
    const image = profile?.picture || `https://robohash.org/${hexPubkey}?set=set1`;

    return {
      title: display_name,
      description: about,
      openGraph: {
        title: `${display_name} (@${shortenPubkey(npub)})`,
        description: about,
        images: [image],
      },
      twitter: {
        card: "summary",
        title: display_name,
        description: about,
        images: [image],
      },
    };
  } catch (err) {
    return {
      title: "Profile",
    };
  }
}

export default async function ProfilePage({ params }: Props) {
  const { npub } = await params;

  return (
    <Suspense fallback={
      <>
        <div className="h-48 bg-gray-200 dark:bg-gray-800 animate-pulse" />
        <div className="px-4 pb-4 animate-pulse">
          <div className="relative flex justify-between items-end -mt-16 mb-4">
            <div className="w-32 h-32 rounded-full bg-gray-300 dark:bg-gray-700 ring-4 ring-white dark:ring-black" />
            <div className="w-32 h-10 rounded-full bg-gray-200 dark:bg-gray-800" />
          </div>
          <div className="space-y-3">
            <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-1/3" />
            <div className="h-4 bg-gray-100 dark:bg-gray-900 rounded w-full" />
          </div>
        </div>
        <FeedSkeleton />
      </>
    }>
      <ProfileContent npubParam={npub} />
    </Suspense>
  );
}
