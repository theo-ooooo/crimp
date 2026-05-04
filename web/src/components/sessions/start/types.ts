import type { GymItem } from '@/lib/schemas/gym';

export type StartSessionGymChoice = {
  extId: string;
  name: string;
  brand?: string | null;
  address?: string | null;
};

export interface StartSessionGymChoiceModel {
  mainGym: StartSessionGymChoice | null;
  activeGym: StartSessionGymChoice | null;
  mode: 'selected' | 'search';
}

export interface StartSessionGymSearchModel {
  searchText: string;
  gyms: GymItem[];
  isLoading: boolean;
  isFetchingNext: boolean;
  error: Error | null;
  hasMore: boolean;
}

export interface StartSessionGymActions {
  onSearchTextChange: (value: string) => void;
  onUseOtherGym: () => void;
  onUseMainGym: () => void;
  onClearSelectedGym: () => void;
  onSelectGym: (gym: GymItem) => void;
  onLoadMore: () => void;
}

export interface StartSessionSubmitModel {
  canSubmit: boolean;
  isPending: boolean;
  error: Error | null;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}

export interface StartSessionViewProps {
  gymChoice: StartSessionGymChoiceModel;
  gymSearch: StartSessionGymSearchModel;
  gymActions: StartSessionGymActions;
  submit: StartSessionSubmitModel;
  startedAtLocal: string;
  onStartedAtChange: (value: string) => void;
}
