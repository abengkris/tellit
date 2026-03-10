import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { NDKProvider } from "@/providers/NDKProvider";
import { ToastContainer } from "@/components/ui/Toast";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAuthStore } from "@/store/auth";
import { Loader2 } from "lucide-react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Tell it! - Whatever it is, just Tell It.",
    template: "%s | Tell it!"
  },
  description: "A decentralized microblogging platform built on Nostr. Whatever it is, just Tell It.",
  metadataBase: new URL("https://tellit.id"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Tell it!",
    description: "Whatever it is, just Tell It.",
    url: "https://tellit.id",
    siteName: "Tell it!",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "https://tellit.id/og-image.png", // This should be created later
        width: 1200,
        height: 630,
        alt: "Tell it!",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tell it!",
    description: "Whatever it is, just Tell It.",
    images: ["https://tellit.id/og-image.png"],
  },  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { _hasHydrated, isLoading: isAuthLoading } = useAuthStore();

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NDKProvider>
          <MainLayout>
            {!_hasHydrated || isAuthLoading ? (
              <div className="min-h-[60vh] flex items-center justify-center bg-white dark:bg-black">
                <Loader2 className="animate-spin text-blue-500" size={48} />
              </div>
            ) : (
              children
            )}
          </MainLayout>
          <ToastContainer />
        </NDKProvider>
      </body>
    </html>
  );
}
