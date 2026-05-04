/**
 * 브라우저 로컬 타임존 기준 `YYYY-MM-DDTHH:mm` 포맷.
 * datetime-local input 기본값 생성에 사용.
 */
export function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

/**
 * datetime-local 값 → ISO 8601 (UTC Z) 변환.
 * 브라우저 로컬 타임존으로 해석 후 `Date` 생성.
 */
export function localInputToIso(local: string): string {
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) {
    return new Date().toISOString();
  }
  return d.toISOString();
}
