/**
 * Helper function to format minutes into human-readable time
 */
export const formatTime = (totalMinutes: number): string => {
  if (totalMinutes < 1) return '0m';

  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);

  if (hours === 0) {
    return `${minutes}m`;
  } else if (minutes === 0) {
    return `${hours}h`;
  } else {
    return `${hours}h ${minutes}m`;
  }
};