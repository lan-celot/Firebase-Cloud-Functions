require('dotenv').config();
const functions = require('firebase-functions');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const cors = require('cors')({ origin: true }); // or specify your frontend: { origin: ['http://localhost:5173'] }
// Initialize PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true
});


// Add error handler for pool
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

// Utility function to get role_id by role_name
async function getRoleIdByName(roleName) {
  const result = await pool.query(
    "SELECT role_id FROM role WHERE role_name = $1",
    [roleName]
  );
  return result.rows.length > 0 ? result.rows[0].role_id : null;
}

exports.getUserType = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed'
      });
    }
    const { firebaseUid, email } = req.body;
    try {
      // Try Customer
      const customerResult = await pool.query(
        `SELECT customer_type AS "userType"
         FROM Customer_Account_Data
         WHERE customer_id = $1 OR customer_email = $2
         LIMIT 1`,
        [firebaseUid, email]
      );
      if (customerResult.rows.length > 0) {
        return res.json({ userType: customerResult.rows[0].userType });
      }
      // Try Vendor
      const vendorResult = await pool.query(
        `SELECT vendor_type AS "userType"
         FROM Vendor_Account_Data
         WHERE vendor_id = $1 OR vendor_email = $2
         LIMIT 1`,
        [firebaseUid, email]
      );
      if (vendorResult.rows.length > 0) {
        return res.json({
          userType: "vendor",
          vendorType: vendorResult.rows[0].userType,
        });
      }
      // Try Organizer
      const organizerResult = await pool.query(
        `SELECT organizer_type AS "userType"
         FROM Event_Organizer_Account_Data
         WHERE organizer_id = $1 OR organizer_email = $2
         LIMIT 1`,
        [firebaseUid, email]
      );
      if (organizerResult.rows.length > 0) {
        return res.json({ userType: organizerResult.rows[0].userType });
      }
      // Not found
      return res.status(404).json({ message: "User not found" });
    } catch (error) {
      console.error('Error getting user type:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  });
});

exports.registerCustomer = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed'
      });
    }
    const {
      firebaseUid,
      firstName,
      lastName,
      email,
      password,
      phoneNo,
      preferences,
      customerType,
    } = req.body;
    if (!firebaseUid || !firstName || !lastName || !email || !password || !customerType) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }
    try {
      let roleName = "customer";
      const validCustomerTypes = ["enthusiast", "student", "church", "customer"];
      if (!validCustomerTypes.includes(customerType)) {
        return res.status(400).json({ success: false, message: "Invalid customer type" });
      }
      const roleId = await getRoleIdByName(roleName);
      if (!roleId) {
        return res.status(400).json({ success: false, message: "Role not found" });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      await pool.query(
        `INSERT INTO customer_account_data
           (customer_id, customer_first_name, customer_last_name, customer_phone_no, customer_password, customer_type, customer_email, preferences, customer_rating, role_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          firebaseUid,
          firstName,
          lastName,
          phoneNo || null,
          hashedPassword,
          customerType,
          email,
          preferences || null,
          null, // customer_rating
          roleId,
        ]
      );
      return res.json({ success: true });
    } catch (error) {
      if (error.code === "23505") {
        return res.status(400).json({ success: false, message: "Email already registered." });
      }
      console.error('Error registering customer:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  });
});

exports.registerVendor = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed'
      });
    }
    const {
      vendorId,
      vendorBusinessName,
      vendorEmail,
      vendorPassword,
      vendorLocation,
      vendorReviewRating,
      preferences,
      vendorLogoUrl,
      vendorType,
      vendorPhoneNo,
      services,
    } = req.body;
    if (!vendorId || !vendorBusinessName || !vendorEmail || !vendorPassword || !vendorType) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }
    try {
      const roleId = await getRoleIdByName("vendor");
      if (!roleId) {
        return res.status(400).json({ success: false, message: "Invalid vendor role" });
      }
      const hashedPassword = await bcrypt.hash(vendorPassword, 10);
      const result = await pool.query(
        `INSERT INTO vendor_account_data 
          (vendor_id, vendor_business_name, vendor_email, vendor_password, vendor_location, vendor_review_rating, preferences, vendor_logo_url, vendor_type, vendor_phone_no, services, role_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING vendor_id`,
        [
          vendorId,
          vendorBusinessName,
          vendorEmail,
          hashedPassword,
          vendorLocation || null,
          vendorReviewRating || null,
          preferences || null,
          vendorLogoUrl || null,
          vendorType,
          vendorPhoneNo || null,
          services || null,
          roleId,
        ]
      );
      return res.status(201).json({ success: true, vendorId: result.rows[0].vendor_id });
    } catch (error) {
      if (error.code === "23505") {
        return res.status(400).json({ success: false, message: "Email already registered." });
      }
      console.error('Error registering vendor:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  });
});

exports.registerOrganizer = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed'
      });
    }
    const {
      organizerId,
      organizerCompanyName,
      organizerIndustry,
      organizerLocation,
      organizerReviewRating,
      organizerPassword,
      organizerSystemPreferences,
      organizerLogoUrl,
      organizerEmail,
      organizerType,
    } = req.body;
    if (!organizerId || !organizerCompanyName || !organizerEmail || !organizerPassword || !organizerType) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }
    try {
      const roleId = await getRoleIdByName("organizer");
      if (!roleId) {
        return res.status(400).json({ success: false, message: "Invalid organizer role" });
      }
      const hashedPassword = await bcrypt.hash(organizerPassword, 10);
      const result = await pool.query(
        `INSERT INTO event_organizer_account_data 
          (organizer_id, organizer_company_name, organizer_industry, organizer_location, organizer_review_rating, organizer_password, organizer_system_preferences, organizer_logo_url, organizer_email, organizer_type, role_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING organizer_id`,
        [
          organizerId,
          organizerCompanyName,
          organizerIndustry || null,
          organizerLocation || null,
          organizerReviewRating || null,
          hashedPassword,
          organizerSystemPreferences || null,
          organizerLogoUrl || null,
          organizerEmail,
          organizerType,
          roleId,
        ]
      );
      return res.status(201).json({ success: true, organizerId: result.rows[0].organizer_id });
    } catch (error) {
      if (error.code === "23505") {
        return res.status(400).json({ success: false, message: "Email already registered." });
      }
      console.error('Error registering organizer:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  });
});

exports.login = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed'
      });
    }
    try {
      const { email, password } = req.body;
      // Try Customer login
      const customerResult = await pool.query(
        `SELECT * FROM Customer_Account_Data WHERE Customer_Email = $1`,
        [email]
      );
      if (customerResult.rows.length > 0) {
        const customer = customerResult.rows[0];
        const isMatch = await bcrypt.compare(password, customer.customer_password);
        if (!isMatch) {
          return res.status(401).json({ success: false, message: "Invalid email or password." });
        }
        return res.status(200).json({
          success: true,
          user: {
            id: customer.customer_id,
            email: customer.customer_email,
            userType: customer.customer_type,
            firstName: customer.customer_first_name,
            lastName: customer.customer_last_name,
          },
        });
      }
      // Try Vendor login
      const vendorResult = await pool.query(
        `SELECT * FROM Vendor_Account_Data WHERE Vendor_Email = $1`,
        [email]
      );
      if (vendorResult.rows.length > 0) {
        const vendor = vendorResult.rows[0];
        const isMatch = await bcrypt.compare(password, vendor.vendor_password);
        if (!isMatch) {
          return res.status(401).json({ success: false, message: "Invalid email or password." });
        }
        return res.status(200).json({
          success: true,
          user: {
            id: vendor.vendor_id,
            email: vendor.vendor_email,
            userType: "vendor",
            businessName: vendor.vendor_business_name,
            location: vendor.vendor_location,
            reviewRating: vendor.vendor_review_rating,
            logoUrl: vendor.vendor_logo_url,
          },
        });
      }
      // Try Organizer login
      const organizerResult = await pool.query(
        `SELECT * FROM Event_Organizer_Account_Data WHERE Organizer_Email = $1`,
        [email]
      );
      if (organizerResult.rows.length > 0) {
        const organizer = organizerResult.rows[0];
        const isMatch = await bcrypt.compare(password, organizer.organizer_password);
        if (!isMatch) {
          return res.status(401).json({ success: false, message: "Invalid email or password." });
        }
        return res.status(200).json({
          success: true,
          user: {
            id: organizer.organizer_id,
            email: organizer.organizer_email,
            userType: organizer.organizer_type,
            companyName: organizer.organizer_company_name,
            location: organizer.organizer_location,
            industry: organizer.organizer_industry,
            logoUrl: organizer.organizer_logo_url,
            reviewRating: organizer.organizer_review_rating,
          },
        });
      }
      // If no match found
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    } catch (error) {
      console.error('Error during login:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  });
});

exports.syncUser = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed'
      });
    }
    console.log("Received sync request headers:", req.headers);
    console.log("Received sync request body:", req.body);
    const { firebaseUid, email, userType, vendorType } = req.body;
    if (!firebaseUid || !email || !userType) {
      console.log("Missing required fields:", { firebaseUid, email, userType });
      return res.status(400).json({
        success: false,
        message: "Missing required fields: firebaseUid, email, and userType are required",
      });
    }
    try {
      let userExists = false;
      let userId = null;
      // Check Customer
      console.log("Checking Customer_Account_Data for email:", email);
      const customerResult = await pool.query(
        "SELECT customer_id FROM Customer_Account_Data WHERE customer_email = $1",
        [email]
      );
      if (customerResult.rows.length) {
        userExists = true;
        userId = customerResult.rows[0].customer_id;
        console.log("Found existing customer:", userId);
      }
      // Check Vendor
      console.log("Checking Vendor_Account_Data for email:", email);
      const vendorResult = await pool.query(
        "SELECT vendor_id FROM Vendor_Account_Data WHERE vendor_email = $1",
        [email]
      );
      if (vendorResult.rows.length) {
        userExists = true;
        userId = vendorResult.rows[0].vendor_id;
        console.log("Found existing vendor:", userId);
      }
      // Check Organizer
      console.log("Checking Event_Organizer_Account_Data for email:", email);
      const organizerResult = await pool.query(
        "SELECT organizer_id FROM Event_Organizer_Account_Data WHERE organizer_email = $1",
        [email]
      );
      if (organizerResult.rows.length) {
        userExists = true;
        userId = organizerResult.rows[0].organizer_id;
        console.log("Found existing organizer:", userId);
      }
      // Create new user if not found
      if (!userExists) {
        console.log("Creating new user of type:", userType);
        switch (userType) {
          case "individual":
            await pool.query(
              `INSERT INTO Customer_Account_Data
               (customer_id, customer_email, customer_type,
                customer_first_name, customer_last_name)
               VALUES ($1,$2,$3,$4,$5)`,
              [firebaseUid, email, userType, "New", "User"]
            );
            break;
          case "vendor":
            await pool.query(
              `INSERT INTO Vendor_Account_Data
               (vendor_id, vendor_email, vendor_type, vendor_business_name)
               VALUES ($1,$2,$3,$4)`,
              [firebaseUid, email, vendorType ?? "general", "New Business"]
            );
            break;
          case "organizer":
            await pool.query(
              `INSERT INTO Event_Organizer_Account_Data
               (organizer_id, organizer_email, organizer_type, organizer_company_name)
               VALUES ($1,$2,$3,$4)`,
              [firebaseUid, email, userType, "New Company"]
            );
            break;
          default:
            return res.status(400).json({
              success: false,
              message: `Invalid user type: ${userType}`,
            });
        }
        console.log("Successfully created new user");
      }
      return res.status(200).json({
        success: true,
        message: "User data synced successfully",
        userId: firebaseUid,
      });
    } catch (error) {
      console.error("Error syncing user data:", error);
      if (error.code === "23505") {
        return res.status(400).json({
          success: false,
          message: "User with this email already exists",
        });
      } else if (error.code === "23502") {
        return res.status(400).json({
          success: false,
          message: "Required fields are missing",
        });
      }
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  });
});

// ... existing imports and code ...

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