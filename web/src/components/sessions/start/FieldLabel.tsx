import type { ReactNode } from 'react';

export function FieldLabel({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-caption font-semibold text-text-3">{label}</span>
      {children}
    </label>
  );
}
