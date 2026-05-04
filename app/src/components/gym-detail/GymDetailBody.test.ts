import { openingStatusLabel } from './GymDetailBody';

describe('openingStatusLabel', () => {
  it('shows opening status with closing time when the gym is open now', () => {
    const schedule = JSON.stringify({
      'mon-fri': '10:00-23:00',
      'sat-sun': '10:00-22:00',
    });
    const mondayNoon = new Date(2026, 4, 4, 12, 0, 0);

    expect(openingStatusLabel(schedule, mondayNoon)).toBe('영업중 · 23:00 마감');
  });

  it('shows today closed when the gym has no hours for the current day', () => {
    const schedule = JSON.stringify({
      mon: '10:00-23:00',
    });
    const sundayNoon = new Date(2026, 4, 3, 12, 0, 0);

    expect(openingStatusLabel(schedule, sundayNoon)).toBe('오늘 휴무');
  });

  it('shows opening time when the gym opens later today', () => {
    const schedule = JSON.stringify({
      mon: '18:00-23:00',
    });
    const mondayMorning = new Date(2026, 4, 4, 10, 0, 0);

    expect(openingStatusLabel(schedule, mondayMorning)).toBe('오늘 18:00 오픈');
  });
});
