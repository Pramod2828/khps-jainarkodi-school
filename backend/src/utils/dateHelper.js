/**
 * Date and Time Utilities with Asia/Kolkata timezone support
 */

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Calculates day of the week from YYYY-MM-DD date string or Date object
 * @param {string|Date} dateInput 
 * @returns {string} Day name (e.g. "Saturday")
 */
function calculateDayFromDate(dateInput) {
  if (!dateInput) return 'Monday';
  
  // Parse date string (e.g., '2026-08-15')
  let dateObj;
  if (typeof dateInput === 'string') {
    const parts = dateInput.split('-');
    if (parts.length === 3) {
      dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    } else {
      dateObj = new Date(dateInput);
    }
  } else {
    dateObj = new Date(dateInput);
  }

  if (isNaN(dateObj.getTime())) {
    return 'Monday';
  }

  return DAYS[dateObj.getDay()];
}

/**
 * Returns current Date and Time formatted for Asia/Kolkata
 */
function getKolkataNow() {
  const now = new Date();
  const options = { timeZone: 'Asia/Kolkata', hour12: false };
  const formatter = new Intl.DateTimeFormat('en-CA', {
    ...options,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  return formatter.format(now).replace(', ', ' ');
}

/**
 * Formats time string to 12-hour AM/PM format (e.g., 16:30 -> 4:30 PM)
 * @param {string} timeStr - HH:MM or HH:MM:SS
 */
function formatTime12Hr(timeStr) {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  let hour = parseInt(parts[0]);
  const minute = parts[1] || '00';
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  hour = hour ? hour : 12;
  return `${hour}:${minute} ${ampm}`;
}

module.exports = {
  calculateDayFromDate,
  getKolkataNow,
  formatTime12Hr
};
