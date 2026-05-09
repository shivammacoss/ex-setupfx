import { ImageResponse } from 'next/og';

export const size = { width: 64, height: 64 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #FFD24A 0%, #C68A00 100%)',
          color: '#1a1209',
          fontSize: 28,
          fontWeight: 800,
          letterSpacing: -1.5,
          borderRadius: 14,
        }}
      >
        SP
      </div>
    ),
    size,
  );
}
