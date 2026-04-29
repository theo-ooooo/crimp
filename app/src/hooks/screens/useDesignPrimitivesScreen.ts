import { useState } from 'react';

export function useDesignPrimitivesScreen() {
  const [chipActive, setChipActive] = useState<string>('all');

  return {
    chipActive,
    setChipActive,
  };
}
