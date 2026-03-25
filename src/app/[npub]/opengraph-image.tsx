import { ImageResponse } from 'next/og';
import { decodeNip19 } from "@/lib/utils/nip19";
import { resolveVanitySlug, isVanitySlug } from "@/lib/utils/identity";
import { connectNDK } from "@/lib/ndk";

export const runtime = 'edge';

export const alt = 'Tell it! Profile';
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

async function resolveSlug(slug: string): Promise<string> {
  if (slug.startsWith("npub1")) {
    try {
      const { id } = decodeNip19(slug);
      return id;
    } catch (_err) {
      return "";
    }
  }

  if (isVanitySlug(slug)) {
    const pubkey = await resolveVanitySlug(slug);
    if (pubkey) return pubkey;
  }

  if (/^[0-9a-fA-F]{64}$/.test(slug)) {
    return slug;
  }

  return "";
}

export default async function Image({ params }: { params: { npub: string } }) {
  const { npub: slug } = await params;
  const hexPubkey = await resolveSlug(slug);

  let profileData = {
    display_name: "Someone",
    name: "someone",
    picture: `https://robohash.org/${hexPubkey || 'default'}?set=set1`,
    about: "A decentralized identity on Nostr.",
    nip05: ""
  };

  if (hexPubkey) {
    try {
      const ndk = await connectNDK();
      const user = ndk.getUser({ pubkey: hexPubkey });
      const profile = await user.fetchProfile();
      if (profile) {
        profileData = {
          display_name: String(profile.display_name || profile.name || "Someone"),
          name: String(profile.name || ""),
          picture: profile.picture || profileData.picture,
          about: profile.about || profileData.about,
          nip05: profile.nip05 || ""
        };
      }
    } catch (e) {
      console.error("OG Image generation profile fetch failed", e);
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#000',
          backgroundImage: 'radial-gradient(circle at 50% 50%, #1e1b4b 0%, #000 100%)',
          fontFamily: 'sans-serif',
          padding: '40px',
          color: 'white',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '40px',
            marginBottom: '40px',
          }}
        >
          { }
          <img
            src={profileData.picture}
            alt={profileData.display_name}
            style={{
              width: '240px',
              height: '240px',
              borderRadius: '120px',
              border: '8px solid #3b82f6',
              objectFit: 'cover',
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <h1 style={{ fontSize: '72px', margin: 0, fontWeight: 'bold' }}>
              {profileData.display_name}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <p style={{ fontSize: '32px', color: '#3b82f6', margin: '8px 0', fontWeight: 'bold' }}>
                @{profileData.name || 'user'}
              </p>
              {profileData.nip05 && (
                <p style={{ fontSize: '24px', color: '#94a3b8', margin: 0 }}>
                  ({profileData.nip05})
                </p>
              )}
            </div>
          </div>
        </div>
        <p
          style={{
            fontSize: '32px',
            textAlign: 'center',
            maxWidth: '900px',
            color: '#cbd5e1',
            lineHeight: 1.4,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {profileData.about}
        </p>
        <div
          style={{
            position: 'absolute',
            bottom: '40px',
            right: '40px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div style={{ width: '40px', height: '40px', backgroundColor: '#3b82f6', borderRadius: '8px' }}></div>
          <p style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>Tell it!</p>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
