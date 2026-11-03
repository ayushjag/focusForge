type FocusInterval = {
  status: string;
  actualStart: Date;
  actualEnd: Date | null;
};

export const createDayKeyFormatter = (timezone: string) => {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return (date: Date): string => {
    const parts = Object.fromEntries(
      formatter.formatToParts(date).map(({ type, value }) => [type, value]),
    );
    return `${parts.year}-${parts.month}-${parts.day}`;
  };
};

export const addDays = (dateKey: string, days: number): string => {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

export const creditedMillisecondsByDay = (
  sessions: FocusInterval[],
  timezone: string,
): Map<string, number> => {
  const dayKey = createDayKeyFormatter(timezone);
  const result = new Map<string, number>();

  for (const session of sessions) {
    if (session.status !== "COMPLETED" || !session.actualEnd) continue;

    let cursor = session.actualStart.getTime();
    const end = session.actualEnd.getTime();
    while (cursor < end) {
      const date = dayKey(new Date(cursor));
      let segmentEnd = end;

      if (dayKey(new Date(end - 1)) !== date) {
        let low = cursor + 1;
        let high = end;
        while (low < high) {
          const middle = low + Math.floor((high - low) / 2);
          if (dayKey(new Date(middle)) === date) low = middle + 1;
          else high = middle;
        }
        segmentEnd = low;
      }

      result.set(date, (result.get(date) ?? 0) + segmentEnd - cursor);
      cursor = segmentEnd;
    }
  }

  return result;
};
