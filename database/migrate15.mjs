import oracledb from 'oracledb'
import dotenv from 'dotenv'
dotenv.config()

const conn = await oracledb.getConnection({
  user:          process.env.DB_USER,
  password:      process.env.DB_PASSWORD,
  connectString: process.env.DB_CONNECT_STRING,
})

console.log('Running migration 015...')

await conn.execute(
  `ALTER TABLE vehicle_requests MODIFY (meter_before NUMBER, meter_after NUMBER)`,
  [],
  { autoCommit: true }
)
console.log('  Modified: meter_before NUMBER, meter_after NUMBER (removed precision limit)')

console.log('Migration 015 complete.')
await conn.close()
