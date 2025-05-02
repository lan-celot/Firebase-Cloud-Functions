# Firebase Cloud Functions Multi-Tenant API

This repository provides a framework for building multi-tenant internal APIs using Firebase Cloud Functions. It enables each tenant to create and manage their own set of APIs while leveraging Firebase Authentication and Cloud Functions for secure, serverless execution.

## Architecture Overview 🏗️

The solution uses a hybrid cloud architecture:

- **Authentication & Function Execution**: 
  - Firebase Authentication for user management and secure access
  - Firebase Cloud Functions for serverless compute and API endpoints
  
- **Storage & Backend Services**: Integreat BaaS (Backend as a Service) hosted on AWS
  - AWS API Gateway for extended API management
  - AWS Lambda for additional serverless compute needs
  - S3 buckets for scalable object storage


## Authentication Requirements 🔑

All API calls require Firebase Authentication JWT tokens with specific custom claims:

- **Required User Claims**:
  - `role`: User's role within the application (`admin`, `user`, `manager`, etc.)
  - `tenant`: The tenant identifier (`church`, `pillar`, `event`, `sdlc`)
  - `projectNumber`: Unique identifier for specific project within a tenant

### Custom Claims Management Example

```javascript
const admin = require('firebase-admin');

/**
 * Sets custom claims for a user to define their access rights
 * @param {string} uid - The Firebase user ID
 * @param {string} role - User role (admin, user, manager, etc.)
 * @param {string} tenant - Tenant identifier (church, pillar, event, sdlc)
 * @param {string} projectNumber - Specific project number
 * @returns {Promise<void>}
 */
async function setUserClaims(uid, role, tenant, projectNumber) {
  try {
    // Set custom claims
    await admin.auth().setCustomUserClaims(uid, {
      role,
      tenant,
      projectNumber
    });
    
    console.log(`Successfully set claims for user ${uid}`);
    // The new custom claims will propagate to the user's ID token when they sign in again
    
  } catch (error) {
    console.error('Error setting custom claims:', error);
    throw error;
  }
}

/**
 * Verifies if a user has the required claims to access a resource
 * @param {Object} decodedToken - The decoded Firebase ID token
 * @param {string} requiredRole - The required role to access resource
 * @param {string} requiredTenant - The required tenant to access resource
 * @returns {boolean} Whether the user has sufficient permissions
 */
function verifyUserClaims(decodedToken, requiredRole, requiredTenant) {
  // Extract custom claims
  const { role, tenant } = decodedToken;
  
  // Admin role has access to all tenants
  if (role === 'admin') return true;
  
  // Check if user has the required role and belongs to the required tenant
  return role === requiredRole && tenant === requiredTenant;
}

// Example usage in an HTTP callable function
exports.securedFunction = functions.https.onCall((data, context) => {
  // Check if user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated to call this function'
    );
  }
  
  // Check if user has required claims
  const { role, tenant, projectNumber } = context.auth.token;
  
  if (!role || !tenant || !projectNumber) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'User lacks required claims (role, tenant, projectNumber)'
    );
  }
  
  // Check for specific permissions
  if (role !== 'admin' && tenant !== 'church') {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Function requires admin role or church tenant'
    );
  }
  
  // Function logic for authorized user...
  return { success: true };
});
```

## Implementation Architecture 📂

```
functions/
├── src/
│   ├── config/             # Configuration files
│   │   └── firebase.js     # Firebase initialization
│   ├── triggers/           # Organized by trigger type
│   │   ├── auth/           # Auth trigger functions
│   │   └── http/           # HTTPS callable functions
│   ├── services/           # Business logic layer
│   │   └── tenantService.js  # Tenant-specific operations
│   ├── utils/              # Helper functions
│   │   └── logger.js       # Logging utility
│   └── index.js            # Main entry point
├── package.json            # Project dependencies
└── firebase.json           # Firebase configuration
```

## Authentication Strategy 🔐

Firebase Authentication provides:
- Multi-tenant user management with custom claims for tenant identification
- Role-based access control through custom claims
- Integration with various authentication providers (email/password, Google, Facebook, etc.)
- Secure token verification for API access

## Cross-Cloud Integration 🌉

This platform bridges Firebase services with AWS-hosted Integreat backend:
- Firebase Functions communicate with AWS API Gateway endpoints
- S3 bucket access managed through Firebase Functions as a secure proxy
- Unified authentication strategy across both clouds

## Security Considerations 🛡️

- All APIs are protected by Firebase Authentication
- Tenant isolation is enforced through security rules and function-level checks
- Cross-cloud communication is secured through proper IAM roles and API keys
- Data is encrypted in transit and at rest

## Getting Started 🏁

This project is already set up and ready to be forked. To get started with your own version:

1. **Fork this repository** to your own GitHub account
2. **Clone your forked repository**:
   ```bash
   git clone https://github.com/YOUR-USERNAME/Firebase-Cloud-Functions.git
   cd Firebase-Cloud-Functions
   ```
3. **Install Firebase CLI** globally if you haven't already:
   ```bash
   npm install -g firebase-tools
   ```
4. **Login to Firebase** using the account credentials provided in the PDF:
   ```bash
   firebase login
   ```
5. **Install dependencies**:
   ```bash
   cd functions
   npm install
   ```
6. **Make your changes** to customize the functions for your specific tenant needs
7. **Deploy your customized functions**:
   ```bash
   firebase deploy --only functions
   ```

> **Note**: Each tenant should only modify their own functions and respect the multi-tenant architecture. Your custom claims will determine which resources you can access.


