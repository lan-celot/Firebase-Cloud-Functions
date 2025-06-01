require('dotenv').config();
const functions = require('firebase-functions');
const { Pool } = require('pg');
const cors = require('cors')({ origin: true });

// Initialize PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true
});

// Add error handler for pool
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

/**
 * HTTP function to create a new event
 */
exports.createEvent = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Origin', 'http://localhost:5173');
      res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Accept, Origin');
      res.status(204).send('');
      return;
    }

    if (req.method !== 'POST') {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed'
      });
    }

    try {
      const eventData = req.body;
    
      // Validate required fields
      const requiredFields = [
        'event_name',
        'event_type_id',
        'start_date',
        'end_date',
        'start_time',
        'end_time',
        'event_location'
      ];
    
      const missingFields = requiredFields.filter(field => !eventData[field]);
      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Missing required fields: ${missingFields.join(', ')}`
        });
      }
    
      // Combine date and time into datetime strings
      const start_datetime = `${eventData.start_date}T${eventData.start_time}`;
      const end_datetime = `${eventData.end_date}T${eventData.end_time}`;
    
      const client = await pool.connect();
      const insertQuery = `
        INSERT INTO events (
          event_name, event_type_id, event_desc, venue_id, organizer_id, customer_id, event_status,
          start_date, end_date, guests, attire, budget, liking_score, start_datetime, end_datetime, services, revenue
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $12, DEFAULT, $13, $14, $15, DEFAULT
        ) RETURNING *
      `;
      const values = [
        eventData.event_name,
        eventData.event_type_id,
        eventData.event_overview || "", // event_desc
        eventData.venue_id || null,
        eventData.organizer_id || null,
        eventData.customer_id,
        eventData.event_status || 'pending',
        eventData.start_date,
        eventData.end_date,
        eventData.guests || 0,
        eventData.attire || "",
        eventData.budget || "",
        start_datetime,
        end_datetime,
        eventData.services || "",
      ];
    
      const result = await client.query(insertQuery, values);
      client.release();
    
      res.set('Access-Control-Allow-Origin', 'http://localhost:5173');
      res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Accept, Origin');
    
      return res.status(200).json({
        success: true,
        data: result.rows
      });
    
    } catch (error) {
      console.error('Error processing event:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  });
});

exports.getCampusEvents = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    console.log('getCampusEvents function called');

    if (req.method !== 'GET') {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed'
      });
    }

    try {
      const client = await pool.connect();
      
      const queryCampus = `
        SELECT 
          event_id,
          event_name,
          event_type_id,
          event_desc,
          venue_id,
          organizer_id,
          customer_id,
          event_status,
          start_date,
          end_date,
          guests,
          attire,
          budget,
          liking_score,
          start_datetime,
          end_datetime,
          services,
          revenue
        FROM events
        WHERE organizer_id = 1000
      `;
      
      const result = await client.query(queryCampus);
      client.release();

      return res.status(200).json({
        success: true,
        data: result.rows
      });

    } catch (error) {
      console.error('Error details:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  });
});

exports.getChurchEvents = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    console.log('getChurchEvents function called');

    if (req.method !== 'GET') {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed'
      });
    }

    try {
      const client = await pool.connect();
      
      const queryChurch = `
        SELECT 
          event_id,
          event_name,
          event_type_id,
          event_desc,
          venue_id,
          organizer_id,
          customer_id,
          event_status,
          start_date,
          end_date,
          guests,
          attire,
          budget,
          liking_score,
          start_datetime,
          end_datetime,
          services,
          revenue
        FROM events
        WHERE organizer_id = 10001
      `;
      
      const result = await client.query(queryChurch);
      client.release();

      return res.status(200).json({
        success: true,
        data: result.rows
      });

    } catch (error) {
      console.error('Error details:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  });
});

// ... existing code ...

exports.getAllEvents = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    console.log('getAllEvents function called');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Origin', 'http://localhost:5173');
      res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Accept, Origin');
      res.status(204).send('');
      return;
    }

    if (req.method !== 'GET') {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed'
      });
    }

    try {
      const client = await pool.connect();
      const customerId = req.query.customerId;
      
      let queryAllEvents = `
        SELECT 
          event_id,
          event_name,
          event_type_id,
          event_desc,
          venue_id,
          organizer_id,
          customer_id,
          event_status,
          start_date,
          end_date,
          guests,
          attire,
          budget,
          liking_score,
          start_datetime,
          end_datetime,
          services,
          revenue
        FROM events
      `;

      // Add WHERE clause if customerId is provided
      if (customerId) {
        queryAllEvents += ` WHERE customer_id = $1`;
      }
      
      queryAllEvents += ` ORDER BY start_date DESC`;
      
      const result = customerId 
        ? await client.query(queryAllEvents, [customerId])
        : await client.query(queryAllEvents);
        
      client.release();

      // Set CORS headers for the actual response
      res.set('Access-Control-Allow-Origin', 'http://localhost:5173');
      res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Accept, Origin');

      return res.status(200).json({
        success: true,
        data: result.rows
      });

    } catch (error) {
      console.error('Error details:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  });
});

// ... rest of the code ...

// ... other functions ...

exports.getEventTypes = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Origin', 'http://localhost:5173');
      res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Accept, Origin');
      res.status(204).send('');
      return;
    }

    console.log('getEventTypes function called');

    if (req.method !== 'GET') {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed'
      });
    }

    try {
      const client = await pool.connect();
      
      const queryEventTypes = `
        SELECT 
          event_type_id,
          event_type_name
        FROM event_type
        ORDER BY event_type_name ASC
      `;
      
      const result = await client.query(queryEventTypes);
      client.release();

      // Set CORS headers for the actual response
      res.set('Access-Control-Allow-Origin', 'http://localhost:5173');
      res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Accept, Origin');

      return res.status(200).json({
        success: true,
        data: result.rows
      });

    } catch (error) {
      console.error('Error details:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  });
});

exports.getUserEvents = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Origin', 'http://localhost:5173');
      res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Accept, Origin');
      res.status(204).send('');
      return;
    }

    if (req.method !== 'GET') {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed'
      });
    }

    try {
      const { user_id, role_id } = req.query; // user_id is the Firebase UID

      if (!user_id || !role_id) {
        return res.status(400).json({
          success: false,
          error: 'Missing required parameters: user_id and role_id'
        });
      }

      let eventUserField;
      if (role_id === '1') {
        eventUserField = 'customer_id';
      } else if (role_id === '2') {
        eventUserField = 'organizer_id';
      } else if (role_id === '3') {
        eventUserField = 'vendor_id';
      } else {
        return res.status(400).json({
          success: false,
          error: 'Role not supported for event lookup'
        });
      }

      const client = await pool.connect();
      const eventsResult = await client.query(
        `
        SELECT 
          e.*,
          et.event_type_name
        FROM events e
        LEFT JOIN event_type et ON e.event_type_id = et.event_type_id
        WHERE e.${eventUserField} = $1
        ORDER BY e.start_date DESC
        `,
        [user_id]
      );
      client.release();

      res.set('Access-Control-Allow-Origin', 'http://localhost:5173');
      res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Accept, Origin');

      return res.status(200).json({
        success: true,
        data: eventsResult.rows
      });

    } catch (error) {
      console.error('Error details:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  });
});

exports.getCustomerEvents = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Origin', 'http://localhost:5173');
      res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Accept, Origin');
      res.status(204).send('');
      return;
    }

    if (req.method !== 'GET') {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed'
      });
    }

    try {
      const { user_id } = req.query;
      if (!user_id) {
        return res.status(400).json({
          success: false,
          error: 'Missing required parameter: user_id'
        });
      }

      const client = await pool.connect();
      const eventsResult = await client.query(
        `
        SELECT 
          e.*,
          et.event_type_name
        FROM events e
        LEFT JOIN event_type et ON e.event_type_id = et.event_type_id
        WHERE e.customer_id = $1
        ORDER BY e.start_date DESC
        `,
        [user_id]
      );
      client.release();

      res.set('Access-Control-Allow-Origin', 'http://localhost:5173');
      res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Accept, Origin');

      return res.status(200).json({
        success: true,
        data: eventsResult.rows
      });

    } catch (error) {
      console.error('Error details:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  });
});

exports.getOrganizerEvents = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Origin', 'http://localhost:5173');
      res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Accept, Origin');
      res.status(204).send('');
      return;
    }

    if (req.method !== 'GET') {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed'
      });
    }

    try {
      const { user_id } = req.query;
      if (!user_id) {
        return res.status(400).json({
          success: false,
          error: 'Missing required parameter: user_id'
        });
      }

      const client = await pool.connect();
      const eventsResult = await client.query(
        `
        SELECT 
          e.*,
          et.event_type_name
        FROM events e
        LEFT JOIN event_type et ON e.event_type_id = et.event_type_id
        WHERE e.organizer_id = $1
        ORDER BY e.start_date DESC
        `,
        [user_id]
      );
      client.release();

      res.set('Access-Control-Allow-Origin', 'http://localhost:5173');
      res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Accept, Origin');

      return res.status(200).json({
        success: true,
        data: eventsResult.rows
      });

    } catch (error) {
      console.error('Error details:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  });
});


