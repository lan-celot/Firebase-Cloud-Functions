/**
 * Simple service that provides Rick Roll functionality
 */

// Rick Roll video URL
const RICK_ROLL_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

/**
 * Get the Rick Roll URL
 * @returns {string} The URL to Rick Astley's "Never Gonna Give You Up"
 */
const getRickRollURL = () => {
  return RICK_ROLL_URL;
};

/**
 * Log that someone is about to get Rick Rolled
 * @param {string} [source='unknown'] - Source of the Rick Roll request
 */
const logRickRoll = (source = 'unknown') => {
  console.log(`Someone from ${source} is about to get Rick Rolled!`);
};

module.exports = {
  getRickRollURL,
  logRickRoll
};