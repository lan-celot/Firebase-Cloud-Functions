const admin = require('firebase-admin');
const { onRequest } = require('firebase-functions/v2/https');
const { defineString } = require('firebase-functions/params');
const { initializeApp } = require('firebase-admin/app');

// Initialize Firebase Admin
initializeApp();

// Import event functions
const eventFunctions = require('./src/triggers/http/eventCallable');

// Common configuration options
const functionConfig = {
  timeoutSeconds: 300,
  memory: '256MB',
  region: 'asia-southeast1'
};

// Export HTTP Functions with region specification and options
exports.createEvent = onRequest(functionConfig, eventFunctions.createEvent);
// ...existing code...

// Export HTTP Functions with region specification and options
exports.createEvent = onRequest(functionConfig, eventFunctions.createEvent);
exports.getCampusEvents = onRequest(functionConfig, eventFunctions.getCampusEvents);
exports.getChurchEvents = onRequest(functionConfig, eventFunctions.getChurchEvents);
console.log('Firebase Functions initialized');