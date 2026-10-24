export const getRemainingMilliseconds = (state, now = Date.now()) => {
  if (!state?.isFocusSessionActive || !state.activeSession?.plannedEnd) {
    return 0;
  }

  const plannedEnd = Date.parse(state.activeSession.plannedEnd);
  const clockOffset = Number.isFinite(state.clockOffsetMs) ? state.clockOffsetMs : 0;

  if (!Number.isFinite(plannedEnd)) {
    return 0;
  }

  return Math.max(0, plannedEnd + clockOffset - now);
};

export const formatRemainingTime = (remainingMilliseconds) => {
  const totalSeconds = Math.max(0, Math.ceil(remainingMilliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return [hours, minutes, seconds]
      .map((value, index) => (index === 0 ? String(value) : String(value).padStart(2, "0")))
      .join(":");
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};
