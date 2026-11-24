/**
 * Formats a timestamp into a human-readable "time ago" format
 * @param timestamp - The timestamp to format (can be a Date, number, or string)
 * @returns A string in the format "x mins x secs ago" or just "x mins ago" or "x secs ago"
 *
 * @example
 * formatTimeAgo(new Date(Date.now() - 90000)) // "1 min 30 secs ago"
 * formatTimeAgo(new Date(Date.now() - 30000)) // "30 secs ago"
 * formatTimeAgo(new Date(Date.now() - 120000)) // "2 mins ago"
 */
export const formatTimeAgo = (timestamp: Date | string | number): string => {
  const now = new Date();
  const past = new Date(timestamp);

  // Calculate the difference in milliseconds
  const diffInMs = now.getTime() - past.getTime();

  // If the timestamp is in the future, return "just now"
  if (diffInMs < 0) {
    return 'just now';
  }

  // Convert to seconds
  const diffInSeconds = Math.floor(diffInMs / 1000);

  // If less than a minute, show only seconds
  if (diffInSeconds < 60) {
    return diffInSeconds <= 1 ? 'just now' : `${diffInSeconds} secs ago`;
  }

  // Calculate minutes and remaining seconds
  const minutes = Math.floor(diffInSeconds / 60);
  const remainingSeconds = diffInSeconds % 60;

  // If less than an hour, show minutes and seconds
  if (minutes < 60) {
    if (remainingSeconds === 0) {
      return minutes === 1 ? '1 min ago' : `${minutes} mins ago`;
    } else {
      const minText = minutes === 1 ? 'min' : 'mins';
      const secText = remainingSeconds === 1 ? 'sec' : 'secs';
      return `${minutes} ${minText} ${remainingSeconds} ${secText} ago`;
    }
  }

  // If more than an hour, show hours and minutes
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours < 24) {
    if (remainingMinutes === 0) {
      return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
    } else {
      const hourText = hours === 1 ? 'hour' : 'hours';
      const minText = remainingMinutes === 1 ? 'min' : 'mins';
      return `${hours} ${hourText} ${remainingMinutes} ${minText} ago`;
    }
  }

  // If more than a day, show days
  const days = Math.floor(hours / 24);
  return days === 1 ? '1 day ago' : `${days} days ago`;
};
