const Database = require('better-sqlite3');
const path = require('path');

const email = process.argv[2];

if (!email) {
  console.log('Uso: npm run add-user email@example.com');
  process.exit(1);
}

const dbPath = path.join(__dirname, '..', 'data', 'bets.db');
const db = new Database(dbPath);

try {
  db.prepare('INSERT INTO allowed_users (email, createdAt) VALUES (?, ?)').run(
    email,
    Date.now()
  );
  console.log(`✅ Usuario autorizado: ${email}`);
} catch (err) {
  if (err.message.includes('UNIQUE')) {
    console.log(`⚠️  El usuario ${email} ya está autorizado`);
  } else {
    console.error('❌ Error:', err.message);
  }
}

db.close();
