import { ImageResponse } from 'next/og';
import { decodeNip19 } from "@/lib/utils/nip19";
import { connectNDK } from "@/lib/ndk";

export const runtime = 'edge';

export const alt = 'Tell it! Post';
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export default async function Image({ params }: { params: { noteId: string } }) {
  const { noteId } = await params;
  
  let eventData = {
    content: "Something was told.",
    author: {
      display_name: "Someone",
      name: "someone",
      picture: `https://robohash.org/default?set=set1`
    }
  };

  try {
    const { id: hexId } = decodeNip19(noteId);
    const ndk = await connectNDK();
    const event = await ndk.fetchEvent(hexId);
    
    if (event) {
      const profile = await event.author.fetchProfile();
      eventData = {
        content: event.content,
        author: {
          display_name: String(profile?.display_name || profile?.name || "Someone"),
          name: String(profile?.name || ""),
          picture: profile?.picture || `https://robohash.org/${event.pubkey}?set=set1`
        }
      };
    }
  } catch (_err) {
    console.error("OG Image generation event fetch failed", _err);
  }

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#000',
          backgroundImage: 'linear-gradient(to bottom right, #0f172a, #000)',
          fontFamily: 'sans-serif',
          padding: '60px',
          color: 'white',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            { }
            <img
              src={eventData.author.picture}
              alt={eventData.author.display_name}
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '40px',
                border: '3px solid #3b82f6',
                objectFit: 'cover',
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '36px', fontWeight: 'bold' }}>{eventData.author.display_name}</span>
              <span style={{ fontSize: '24px', color: '#3b82f6' }}>@{eventData.author.name}</span>
            </div>
          </div>

          <div
            style={{
              fontSize: '48px',
              lineHeight: 1.3,
              color: '#f8fafc',
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 6,
              WebkitBoxOrient: 'vertical',
              wordBreak: 'break-word',
            }}
          >
            {eventData.content}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '2px solid #1e293b',
            paddingTop: '30px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '32px', height: '32px', backgroundColor: '#3b82f6', borderRadius: '6px' }}></div>
            <span style={{ fontSize: '32px', fontWeight: 'bold' }}>Tell it!</span>
          </div>
          <span style={{ fontSize: '24px', color: '#64748b' }}>tellit.id</span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
