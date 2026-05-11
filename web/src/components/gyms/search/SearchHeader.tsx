'use client';

import { Chip, CrimpIcon } from '@/components/primitives';
import { t } from '@/lib/i18n';

const TOP_BRANDS = ['전체', '클라이밍파크', '더클라임', '볼더스'] as const;

interface SearchHeaderProps {
  resultCount: number;
  inputQ: string;
  selectedBrand: string | null;
  hasFilter: boolean;
  onInputChange: (value: string) => void;
  onClearInput: () => void;
  onBrandSelect: (brand: string | null) => void;
  onResetFilters: () => void;
}

export function SearchHeader({
  resultCount,
  inputQ,
  selectedBrand,
  hasFilter,
  onInputChange,
  onClearInput,
  onBrandSelect,
  onResetFilters,
}: SearchHeaderProps): JSX.Element {
  return (
    <header className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-h1 font-extrabold text-text">
            {t('gym.list.title')}
          </h1>
          <p className="mt-1 text-caption font-semibold text-text-3">
            {resultCount > 0 ? `${resultCount}곳` : ' '}
          </p>
        </div>
        {hasFilter ? (
          <button
            type="button"
            onClick={onResetFilters}
            className="mb-1 text-caption font-bold text-text-3 transition-colors duration-fast ease-standard hover:text-text"
          >
            {t('gym.list.filtersReset')}
          </button>
        ) : null}
      </div>

      <SearchInput
        value={inputQ}
        placeholder={t('gym.list.searchPlaceholder')}
        onChange={onInputChange}
        onClear={onClearInput}
      />

      <BrandFilters selected={selectedBrand} onSelect={onBrandSelect} />
    </header>
  );
}

function SearchInput({
  value,
  placeholder,
  onChange,
  onClear,
}: {
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
  onClear: () => void;
}): JSX.Element {
  return (
    <div className="relative flex items-center">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-4 text-text-3"
      >
        <CrimpIcon.search s={18} />
      </span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-12 w-full rounded-xl bg-subtle pl-11 pr-11 text-body font-semibold text-text placeholder:text-text-3 transition-[outline] duration-fast ease-standard focus:outline focus:outline-2 focus:outline-offset-0 focus:outline-accent"
      />
      {value ? (
        <button
          type="button"
          aria-label={t('common.close')}
          onClick={onClear}
          className="absolute right-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-text-3 transition-colors duration-fast ease-standard hover:bg-subtle-2 hover:text-text"
        >
          <CrimpIcon.close s={18} />
        </button>
      ) : null}
    </div>
  );
}

function BrandFilters({
  selected,
  onSelect,
}: {
  selected: string | null;
  onSelect: (brand: string | null) => void;
}): JSX.Element {
  return (
    <div
      className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:px-0"
      role="group"
      aria-label={t('gym.list.filtersBrand')}
    >
      {TOP_BRANDS.map((b) => {
        const value = b === '전체' ? null : b;
        const active = value === null ? selected === null : selected === value;
        return (
          <Chip
            key={b}
            active={active}
            onClick={() => onSelect(value)}
            className="shrink-0"
          >
            {b}
          </Chip>
        );
      })}
    </div>
  );
}
