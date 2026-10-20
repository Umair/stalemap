// Shared with the old Node scripts in scripts/, which require() it directly.
"use strict";

var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/**
 * @param {Date} date
 * @returns {string} The UTC day as YYYY/MM/DD, used in post URLs.
 */
function urlDay(date) {
  return [date.getUTCFullYear(), String(date.getUTCMonth() + 1).padStart(2, "0"), String(date.getUTCDate()).padStart(2, "0")].join("/");
}

/**
 * @param {Date} date
 * @returns {string} The UTC day as "March 4, 2026".
 */
function longDate(date) {
  return MONTHS[date.getUTCMonth()] + " " + date.getUTCDate() + ", " + date.getUTCFullYear();
}

module.exports = { urlDay: urlDay, longDate: longDate };
