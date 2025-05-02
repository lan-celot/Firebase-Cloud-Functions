/**
 * HTTP function that redirects users to the Rick Roll video
 */

const functions = require('firebase-functions');
const { functions_v1 } = require('../../config/firebase');
const rickRollService = require('../../services/rickRollService');

/**
 * HTTP function that redirects users to the Rick Astley video
 * This responds to GET requests and performs a direct redirect
 */
exports.rickRoll = functions_v1.https.onRequest((req, res) => {
  // This works with any HTTP method, but we'll check for GET specifically
  if (req.method === 'GET') {
    // Log the redirect with source info (if provided as query param)
    const source = req.query.source || req.headers['referer'] || 'direct-link';
    rickRollService.logRickRoll(source);
    
    // Set cache control to prevent caching
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    
    // Perform the redirect to Never Gonna Give You Up
    res.redirect(302, rickRollService.getRickRollURL());
  } else {
    // If not a GET request, return a simple message
    res.status(405).send('Method Not Allowed. Use GET for Rick Rolling.');
  }
});