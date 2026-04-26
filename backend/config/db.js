import mysql from "mysql2";
import dotenv from "dotenv";

dotenv.config();

const getDbConfig = () => {
  const databaseUrl = process.env.DATABASE_URL || process.env.MYSQL_PUBLIC_URL || process.env.MYSQL_URL;
  if (databaseUrl) {
    try {
      const parsed = new URL(databaseUrl);
      return {
        host: parsed.hostname,
        port: Number(parsed.port || 3306),
        user: decodeURIComponent(parsed.username),
        password: decodeURIComponent(parsed.password),
        database: parsed.pathname.replace(/^\//, "") || "social_app",
      };
    } catch (error) {
      console.warn("Invalid DATABASE_URL, fallback to DB_* variables:", error.message);
    }
  }

  return {
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "social_app",
  };
};

const dbConfig = getDbConfig();

const db = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000,
});

db.getConnection((err, conn) => {
  if (err) console.error("MySQL connection failed:", err);
  else {
    console.log("Connected to MySQL");
    conn.release();
  }
});

export default db;

