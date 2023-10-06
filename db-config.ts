import mysql, { Connection, Pool } from "mysql2/promise";

export const pool: Pool = mysql.createPool({
  host: "127.0.0.1",
  user: "root",
  password: "89yt544r",
  database: "tech4u",
  connectionLimit: 10, // Adjust the number of connections as needed
});
export async function testConnection() {
  let connection: Connection | null = null;
  try {
    connection = await pool.getConnection();
    console.log("Connected to MySQL database");
  } catch (err: any) {
    console.error("Database connection failed:", err.message);
  } finally {
    if (connection) {
    }
  }
}
