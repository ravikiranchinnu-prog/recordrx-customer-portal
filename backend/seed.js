/**
 * Seed script to create default superadmin and sample data.
 * Run: node seed.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const connectDB = require('./config/db');

async function seed() {
  await connectDB();

  // Create superadmin if not exists
  const existing = await User.findOne({ email: 'ravikiran' });
  if (!existing) {
    await User.create({
      name: 'Ravi Kiran',
      email: 'ravikiran',
      password: 'Tester@1',
      role: 'superadmin',
      status: 'active'
    });
    console.log('✅ Superadmin created (ravikiran / Tester@1)');
  } else {
    console.log('ℹ️ Superadmin already exists');
  }

  // Create default customer user if not exists
  const custExisting = await User.findOne({ email: 'keepmailingravz@gmail.com' });
  if (!custExisting) {
    await User.create({
      name: 'Ravi',
      email: 'keepmailingravz@gmail.com',
      password: 'Tester@1',
      role: 'customer',
      customerId: 'CUST00001',
      status: 'active'
    });
    console.log('✅ Default customer created (keepmailingravz@gmail.com / Tester@1)');
  } else {
    console.log('ℹ️ Default customer already exists');
  }

  console.log('✅ Seed complete');
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
