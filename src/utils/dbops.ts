import mysql from 'mysql2/promise';
import { RowDataPacket } from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();
import { Pool } from 'mysql2/promise';

export interface Authorization {
    username: string;
    location_code: string;
}
export function createPool(): mysql.Pool {
    const pool = mysql.createPool({
        host: process.env.PM_DBHOST,
        user: process.env.PM_DBUSER,
        password: process.env.PM_DBPASSWORD,
        database: process.env.PM_DBNAME,

        // Connection configuration
        connectionLimit: 50,         // Adjust based on your application needs
        waitForConnections: true,    // Queue queries when no connections available
        queueLimit: 100,              // Unlimited queue (set a number to limit)
        connectTimeout: 10000,       // Connection timeout (10 seconds)

        // Performance and reliability
        enableKeepAlive: true,      // Prevent connection timeouts
        keepAliveInitialDelay: 10000, // Initial delay before keep-alive

        // Character set and timezone
        charset: 'utf8mb4',         // Full Unicode support
        timezone: '+00:00',         // UTC timezone

        // Debug (disable in production)
        debug: process.env.NODE_ENV === 'development',
    });

    // Error handling
    pool.on('connection', (connection) => {
        console.log('New connection established');

        connection.on('error', (err) => {
            console.error('Database connection error:', err);
        });
    });


    // Graceful shutdown helper
    const closePool = async () => {
        try {
            await pool.end();
            console.log('Pool connections closed');
        } catch (err) {
            console.error('Error closing pool:', err);
        } finally {
            process.exit(0);
        }
    };

    // Handle process termination
    process.on('SIGINT', closePool);
    process.on('SIGTERM', closePool);

    return pool;
}


export async function fetchFromDB(pool: mysql.Pool, query: string) {
    const conn = await pool.getConnection();
    try {
        const [rows, fields] = await conn.execute(query);
        conn.release();
        return rows;
    }
    catch (err) {
        conn.release();
        console.log(err);
        return null;
    }
}



export async function getUserAuthorizationFromDB(pool: Pool, username: string): Promise<Authorization> {
    const [rows, _]: [[], any] = await pool.query(
        `SELECT username, location_code FROM authorization WHERE username = ? LIMIT 1`,
        [username]
    );
    let auths = rows.map((row: any) => ({
        username: row.username,
        location_code: row.location_code
    })
    ) as Authorization[];
    console.log("auths from database: ", auths);
    return auths[0];
}

