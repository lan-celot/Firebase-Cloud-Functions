require('dotenv').config();
const functions = require('firebase-functions');
const { Pool } = require('pg');

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

    return res.status(200).json({
      success: true,
      data: [{
        event_id: Date.now(),
        ...eventData,
        event_status: eventData.event_status || null,
        ispackage: eventData.ispackage || false
      }]
    });

  } catch (error) {
    console.error('Error processing event:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

exports.getEvents = functions.https.onRequest(async (req, res) => {
  console.log('getEvents function called');

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    const client = await pool.connect();
    
    // Modified query to select only specific columns
    const query = `
      SELECT 
        event_id,
        event_name,
        event_type_id,
        event_desc,
        start_date,
        end_date,
        start_time,
        end_time,
        location as event_location,
        organizer_id,
        vendor_id,
        customer_id,
        event_status,
        ispackage
      FROM events
      WHERE organizer_id = 1000 || organizer_id = 10001
    `;
    
    const result = await client.query(query);
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