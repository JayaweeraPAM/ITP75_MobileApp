import { connectDB, getDB } from './config/mongodb.js';

async function main() {
  await connectDB();
  const db = await getDB();
  const institutes = await db.collection('institutes').find({}).toArray();
  const users = await db.collection('users').find({}).toArray();
  console.log('INSTITUTES:', JSON.stringify(institutes, null, 2));
  console.log('USERS:', JSON.stringify(users.map(u => ({ id: u.id, _id: u._id, email: u.email, name: u.name, fullName: u.fullName })), null, 2));
  process.exit(0);
}

main().catch(console.error);
