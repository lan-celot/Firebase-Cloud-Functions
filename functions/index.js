const admin = require('firebase-admin');
const { onRequest } = require('firebase-functions/v2/https');
const { defineString } = require('firebase-functions/params');
const { initializeApp } = require('firebase-admin/app');
const { onCall } = require('firebase-functions/v2/https');
const functions = require('firebase-functions');
const { Pool } = require('pg');

// Initialize Firebase Admin
initializeApp();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Common configuration options
const functionConfig = {
  timeoutSeconds: 300,
  memory: '256MB',
  region: 'asia-southeast1'
};

exports.setUserRole = onCall(functionConfig, async (request) => {
  const { uid, role_id } = request.data;
  
  if (!uid || typeof role_id === 'undefined') {
    throw new Error('The function must be called with uid and role_id.');
  }

  try {
    // Verify the role_id exists in the database
    const db = admin.firestore();
    const roleRef = db.collection('roles').doc(role_id.toString());
    const roleDoc = await roleRef.get();

    if (!roleDoc.exists) {
      throw new Error(`Role ID ${role_id} does not exist`);
    }

    // Get the current user's custom claims
    const user = await admin.auth().getUser(uid);
    const currentClaims = user.customClaims || {};

    // Update the user's role_id in the database
    const userRef = db.collection('users').doc(uid);
    await userRef.update({ role_id: Number(role_id) });

    // Set custom claims in Firebase Auth
    await admin.auth().setCustomUserClaims(uid, {
      ...currentClaims,
      role_id: Number(role_id)
    });

    return { 
      success: true, 
      message: `Successfully set role_id ${role_id} for user ${uid}`,
      role_id: Number(role_id)
    };
  } catch (error) {
    console.error('Error in setUserRole:', error);
    throw new Error(error.message || 'Failed to set user role');
  }
});

// Import event functions
const eventFunctions = require('./src/triggers/http/eventCallable');
// Import auth functions
const authFunctions = require('./src/triggers/http/authCallable');

// Export HTTP Functions with region specification and options
exports.createEvent = onRequest(functionConfig, eventFunctions.createEvent);
exports.getCampusEvents = onRequest(functionConfig, eventFunctions.getCampusEvents);
exports.getChurchEvents = onRequest(functionConfig, eventFunctions.getChurchEvents);
exports.getAllEvents = onRequest(functionConfig, eventFunctions.getAllEvents);
exports.getEventTypes = onRequest(functionConfig, eventFunctions.getEventTypes);
exports.getUserEvents = onRequest(functionConfig, eventFunctions.getUserEvents);
exports.getCustomerEvents = onRequest(functionConfig, eventFunctions.getCustomerEvents);
exports.getOrganizerEvents = onRequest(functionConfig, eventFunctions.getOrganizerEvents);

// Export Auth Functions
exports.getUserType = onRequest(functionConfig, authFunctions.getUserType);
exports.getRole = onRequest(functionConfig, authFunctions.getUserType);
exports.registerCustomer = onRequest(functionConfig, authFunctions.registerCustomer);
exports.registerVendor = onRequest(functionConfig, authFunctions.registerVendor);
exports.registerOrganizer = onRequest(functionConfig, authFunctions.registerOrganizer);
exports.login = onRequest(functionConfig, authFunctions.login);
exports.syncUser = onRequest(functionConfig, authFunctions.syncUser);


console.log('Firebase Functions initialized'); 