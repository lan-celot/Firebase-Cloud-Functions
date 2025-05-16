/**
 * Firebase Cloud Functions - Main Entry Point
 */
const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp();

// Import event functions
const eventFunctions = require('./src/triggers/http/eventCallable');

// Export HTTP Functions with region specification
exports.createEvent = functions
  .region('asia-southeast1')
  .https.onRequest(eventFunctions.createEvent);

exports.getEvents = functions
  .region('asia-southeast1')
  .https.onRequest(eventFunctions.getEvents);

console.log('Firebase Functions initialized');