/**
 * Auth trigger that logs when new users are created
 * No database operations - just logging
 */

const { functions_v1 } = require('../../config/firebase');
const rickRollService = require('../../services/rickRollService');

/**
 * When a new user is created, log that they would be Rick Rolled
 */
exports.logNewUserRickRoll = functions_v1.auth.user().onCreate((user) => {
  try {
    const { uid, email, displayName } = user;
    
    // Log that a user would be Rick Rolled
    const userIdentifier = email || displayName || uid;
    rickRollService.logRickRoll(`new user: ${userIdentifier}`);
    
    console.log(`New user created: ${userIdentifier}`);
    console.log(`Rick Roll URL they would see: ${rickRollService.getRickRollURL()}`);
    
    return null;
  } catch (error) {
    console.error('Error in auth trigger:', error);
    return null;
  }
});

/**
 * When a user is deleted, log that they escaped being Rick Rolled
 */
exports.logUserDeletedRickRoll = functions_v1.auth.user().onDelete((user) => {
  const { uid, email, displayName } = user;
  const userIdentifier = email || displayName || uid;
  
  console.log(`User deleted: ${userIdentifier}`);
  console.log(`They have escaped future Rick Rolls!`);
  
  return null;
});