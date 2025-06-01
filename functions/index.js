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

exports.setUserRole = functions.region('asia-southeast1').https.onCall(async (data, context) => {
  const { uid, role_id } = data;
  
  if (!uid || typeof role_id === 'undefined') {
    throw new functions.https.HttpsError('invalid-argument', 'The function must be called with uid and role_id.');
  }

  try {
    // Verify the role_id exists in the database
    const db = admin.firestore();
    const roleRef = db.collection('roles').doc(role_id.toString());
    const roleDoc = await roleRef.get();

    if (!roleDoc.exists) {
      throw new functions.https.HttpsError('not-found', `Role ID ${role_id} does not exist`);
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
    throw new functions.https.HttpsError(
      'internal',
      error.message || 'Failed to set user role'
    );
  }
});

// Import event functions
const eventFunctions = require('./src/triggers/http/eventCallable');
// Import auth functions
const authFunctions = require('./src/triggers/http/authCallable');

// Common configuration options
const functionConfig = {
  timeoutSeconds: 300,
  memory: '256MB',
  region: 'asia-southeast1'
};

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
exports.registerCustomer = onRequest(functionConfig, authFunctions.registerCustomer);
exports.registerVendor = onRequest(functionConfig, authFunctions.registerVendor);
exports.registerOrganizer = onRequest(functionConfig, authFunctions.registerOrganizer);
exports.login = onRequest(functionConfig, authFunctions.login);
exports.syncUser = onRequest(functionConfig, authFunctions.syncUser);
exports.getRole = functions.region('asia-southeast1').https.onCall(async (data, context) => {
  const { firebaseUid } = data;
  
  if (!firebaseUid) {
    throw new functions.https.HttpsError('invalid-argument', 'The function must be called with firebaseUid.');
  }

  try {
    const result = await pool.query(
      `SELECT r.role_id
       FROM role r
       JOIN Customer_Account_Data c ON c.role_id = r.role_id
       WHERE c.customer_id = $1
       UNION
       SELECT r.role_id
       FROM role r
       JOIN Vendor_Account_Data v ON v.role_id = r.role_id
       WHERE v.vendor_id = $1
       UNION
       SELECT r.role_id
       FROM role r
       JOIN Event_Organizer_Account_Data e ON e.role_id = r.role_id
       WHERE e.organizer_id = $1
       LIMIT 1`,
      [firebaseUid]
    );

    if (result.rows.length > 0) {
      return { roleId: result.rows[0].role_id };
    }
    
    throw new functions.https.HttpsError('not-found', 'Role not found');
  } catch (error) {
    console.error('Error getting role:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to get user role',
      error
    );
  }
});

console.log('Firebase Functions initialized'); 