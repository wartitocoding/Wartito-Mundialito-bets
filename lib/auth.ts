import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getDatabase } from "./db";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function createToken(userId: number) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: number };
  } catch {
    return null;
  }
}

export function isUserAllowed(email: string): boolean {
  const db = getDatabase();
  const user = db
    .prepare("SELECT * FROM allowed_users WHERE email = ?")
    .get(email);
  return !!user;
}

export function addAllowedUser(email: string) {
  const db = getDatabase();
  db.prepare("INSERT OR IGNORE INTO allowed_users (email, createdAt) VALUES (?, ?)").run(
    email,
    Date.now()
  );
}

export function createUser(email: string, password: string, name: string, championPrediction: string) {
  const db = getDatabase();
  const hashedPassword = bcrypt.hashSync(password, 10);

  try {
    db.prepare(
      "INSERT INTO users (email, password, name, championPrediction, createdAt) VALUES (?, ?, ?, ?, ?)"
    ).run(email, hashedPassword, name, championPrediction, Date.now());
    return true;
  } catch (err) {
    console.error('createUser SQL error:', err);
    return false;
  }
}

export function getUserByEmail(email: string) {
  const db = getDatabase();
  return db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
}

export function getUserById(id: number) {
  const db = getDatabase();
  return db.prepare("SELECT * FROM users WHERE id = ?").get(id) as any;
}

export function setWorldCupChampion(year: number, champion: string) {
  const db = getDatabase();
  try {
    db.prepare(
      "INSERT OR REPLACE INTO world_cup_config (year, champion, updatedAt) VALUES (?, ?, ?)"
    ).run(year, champion, Date.now());
    return true;
  } catch {
    return false;
  }
}

export function getWorldCupChampion(year: number): string | null {
  const db = getDatabase();
  const result = db
    .prepare("SELECT champion FROM world_cup_config WHERE year = ?")
    .get(year) as any;
  return result?.champion || null;
}

export function updateChampionPoints(year: number) {
  const db = getDatabase();
  const champion = getWorldCupChampion(year);

  if (!champion) return 0;

  const users = db.prepare("SELECT id FROM users WHERE championPrediction = ?").all(champion) as any[];

  let updatedCount = 0;
  for (const user of users) {
    db.prepare("UPDATE users SET championPoints = 10 WHERE id = ?").run(user.id);
    updatedCount++;
  }

  return updatedCount;
}
