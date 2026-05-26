import oracledb from 'oracledb'
import { config } from 'dotenv'

config()

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT

const statements = [
  // 1. Add request_no column
  `ALTER TABLE vehicle_requests ADD (request_no VARCHAR2(20))`,

  // 2. Trigger to auto-generate on INSERT
  `CREATE OR REPLACE TRIGGER trg_vrequest_request_no
BEFORE INSERT ON vehicle_requests
FOR EACH ROW
BEGIN
    :NEW.request_no := 'VR-' || TO_CHAR(SYSDATE, 'DDMMYYYYHH24MI');
END`,

  // 3. Back-fill existing rows
  `UPDATE vehicle_requests
   SET request_no = 'VR-' || TO_CHAR(created_at, 'DDMMYYYYHH24MI') || LPAD(ROWNUM, 2, '0')
   WHERE request_no IS NULL`,

  // 4. Make NOT NULL
  `ALTER TABLE vehicle_requests MODIFY (request_no VARCHAR2(20) NOT NULL)`,
]

async function migrate() {
  let connection
  try {
    connection = await oracledb.getConnection({
      user:          process.env.DB_USER,
      password:      process.env.DB_PASSWORD,
      connectString: process.env.DB_CONNECT_STRING,
    })
    console.log('Connected to Oracle DB\n')

    for (const sql of statements) {
      const label = sql.trim().split('\n')[0].trim().substring(0, 60)
      try {
        await connection.execute(sql, [], { autoCommit: true })
        console.log(`OK  ${label}`)
      } catch (err) {
        if (err.errorNum === 955 || err.errorNum === 1430) {
          console.log(`SKIP (already exists)  ${label}`)
        } else {
          console.error(`FAIL  ${label}`)
          console.error(`      ${err.message}`)
        }
      }
    }
    console.log('\nMigration 012 complete.')
  } catch (err) {
    console.error('Connection failed:', err.message)
    process.exit(1)
  } finally {
    if (connection) await connection.close()
  }
}

migrate()
