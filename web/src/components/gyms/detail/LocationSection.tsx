'use client';

import { KakaoGymMap } from '@/components/gyms/KakaoGymMap';
import type { GymDetail } from '@/lib/schemas/gym';

export function LocationSection({ gym }: { gym: GymDetail }): JSX.Element | null {
  if (!gym.lat || !gym.lng) return null;
  return (
    <section className="flex flex-col gap-3" aria-label="암장 위치">
      <h2 className="text-h2 font-extrabold text-text">위치</h2>
      <KakaoGymMap
        points={[{ id: gym.extId, name: gym.name, lat: gym.lat, lng: gym.lng }]}
        className="h-[180px]"
        level={4}
      />
    </section>
  );
}
