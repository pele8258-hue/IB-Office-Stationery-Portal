import oracledb from 'oracledb'
import dotenv from 'dotenv'
dotenv.config()

const conn = await oracledb.getConnection({
  user:          process.env.DB_USER,
  password:      process.env.DB_PASSWORD,
  connectString: process.env.DB_CONNECT_STRING,
})

console.log('Running migration 014...')

const columns = [
  'ALTER TABLE vehicle_requests ADD meter_before   NUMBER',
  'ALTER TABLE vehicle_requests ADD meter_after    NUMBER',
  'ALTER TABLE vehicle_requests ADD time_out_photo VARCHAR2(500)',
  'ALTER TABLE vehicle_requests ADD time_in_photo  VARCHAR2(500)',
]

for (const ddl of columns) {
  try {
    await conn.execute(ddl)
    console.log('  Added:', ddl.split('ADD ')[1].trim())
  } catch (e) {
    if (e.errorNum === 1430) {
      console.log('  Skipped (already exists):', ddl.split('ADD ')[1].trim())
    } else {
      throw e
    }
  }
}

console.log('Migration 014 complete.')
await conn.close()
