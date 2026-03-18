import { Metadata } from "next";

export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ naddr: string }> 
}): Promise<Metadata> {
  const { naddr } = await params;
  const title = `Article ${naddr.slice(0, 8)}...`;
  
  return {
    title: `${title} | Tell it!`,
    description: "Read this article on Tell it!, a decentralized microblogging platform.",
    openGraph: {
      title: `${title} | Tell it!`,
      description: "Read this article on Tell it!.",
    },
  };
}

export default function ArticleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
