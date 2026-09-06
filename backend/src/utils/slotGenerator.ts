// Walks from startTime to endTime in slotDurationMinutes steps, returning
// "HH:mm" strings. No lunch/break splitting yet — that's a later phase.
export function getCandidateTimes(
  startTime: string,
  endTime: string,
  slotDurationMinutes: number
): string[] {
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);

  const startTotalMinutes = startHour * 60 + startMinute;
  const endTotalMinutes = endHour * 60 + endMinute;

  const times: string[] = [];
  for (
    let minutes = startTotalMinutes;
    minutes + slotDurationMinutes <= endTotalMinutes;
    minutes += slotDurationMinutes
  ) {
    const hour = Math.floor(minutes / 60)
      .toString()
      .padStart(2, '0');
    const minute = (minutes % 60).toString().padStart(2, '0');
    times.push(`${hour}:${minute}`);
  }

  return times;
}
