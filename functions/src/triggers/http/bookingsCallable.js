require("dotenv").config();
const functions = require("firebase-functions");
const { Pool } = require("pg");
const cors = require("cors")({ origin: true });

// PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const validStatuses = ["Pending", "Upcoming", "Past", "Rejected", "Draft"];

/**
 * HTTP Cloud Function to fetch and group bookings by event_status
 */
exports.getBookings = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    // Handle CORS preflight request
    if (req.method === "OPTIONS") {
      res.set("Access-Control-Allow-Origin", "http://localhost:5173");
      res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
      res.set("Access-Control-Allow-Headers", "Content-Type, Accept, Origin");
      res.status(204).send("");
      return;
    }

    if (req.method !== "GET") {
      return res.status(405).json({
        success: false,
        error: "Method not allowed",
      });
    }

    try {
      const client = await pool.connect();
      const result = await client.query(`
        SELECT 
          e.event_id AS id,
          e.event_name AS title,
          e.event_status,
          e.event_type_id,
          et.event_type_name AS event_type,
          e.event_desc,
          e.venue_id,
          e.organizer_id,
          e.customer_id,
          e.start_date,
          e.end_date,
          TO_CHAR(e.start_datetime, 'Mon DD') AS date,
          TO_CHAR(e.start_datetime, 'Day') AS day,
          TO_CHAR(e.start_datetime, 'HH12:MI AM') AS starttime,
          TO_CHAR(e.end_datetime, 'HH12:MI AM') AS endtime,
          e.start_datetime,
          e.end_datetime,
          e.guests,
          e.attire,
          e.budget,
          e.liking_score,
          e.revenue,
          e.services
        FROM events e
        LEFT JOIN event_type et ON e.event_type_id = et.event_type_id
        WHERE e.event_status IN ('Pending', 'Upcoming', 'Past', 'Rejected', 'Draft')
        ORDER BY e.start_datetime DESC
      `);
      client.release();

      const bookings = result.rows;

      const groupedData = {
        Pending: [],
        Upcoming: [],
        Past: [],
        Rejected: [],
        Draft: [],
      };

      bookings.forEach((event) => {
        const status = event.event_status;

        if (validStatuses.includes(status)) {
          groupedData[status].push({
            id: event.id,
            title: event.title,
            event_status: status,
            event_type_id: event.event_type_id,
            event_desc: event.event_desc,
            venue_id: event.venue_id,
            organizer_id: event.organizer_id,
            customer: `Customer ${event.customer_id}`,
            location: `Location ${event.venue_id}`,
            guests: `${event.guests} Guests`,
            attire: event.attire,
            budget: event.budget,
            liking_score: event.liking_score,
            start_date: event.start_date,
            end_date: event.end_date,
            date: event.date?.trim() || "Unknown",
            day: event.day?.trim() || "Unknown",
            startTime: event.starttime,
            endTime: event.endtime,
            start_datetime: event.start_datetime,
            end_datetime: event.end_datetime,
            eventType: event.event_type || "",
            eventDesc: event.event_desc || "",
            services: event.services || "",
          });
        }
      });

      res.set("Access-Control-Allow-Origin", "http://localhost:5173");
      res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
      res.set("Access-Control-Allow-Headers", "Content-Type, Accept, Origin");

      return res.status(200).json({
        success: true,
        data: groupedData,
      });

    } catch (error) {
      console.error("❌ Error fetching bookings:", error);
      return res.status(500).json({
        success: false,
        error: "Internal server error",
        details: error.message,
      });
    }
  });
});
