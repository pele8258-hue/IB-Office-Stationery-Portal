import oracledb from 'oracledb'
import { config } from 'dotenv'

config()

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT

const statements = [
  `CREATE TABLE vehicle_request_passengers (
    id          NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    request_id  NUMBER    NOT NULL,
    staff_id    NUMBER    NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_vr_passenger UNIQUE (request_id, staff_id),
    CONSTRAINT fk_vrp_request  FOREIGN KEY (request_id) REFERENCES vehicle_requests(id),
    CONSTRAINT fk_vrp_staff    FOREIGN KEY (staff_id)   REFERENCES staff(id)
  )`,
]

async function migrate() {
  let connection
  try {
    connection = await oracledb.getConnection({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      connectString: process.env.DB_CONNECT_STRING,
    })

    console.log('Connected to Oracle DB\n')

    for (const sql of statements) {
      const label = sql.trim().split('\n')[0].trim().substring(0, 60)
      try {
        await connection.execute(sql, [], { autoCommit: true })
        console.log(`OK  ${label}`)
      } catch (err) {
        if (err.errorNum === 955) {
          console.log(`SKIP (already exists)  ${label}`)
        } else {
          console.error(`FAIL  ${label}`)
          console.error(`      ${err.message}`)
        }
      }
    }

    console.log('\nMigration complete.')
  } catch (err) {
    console.error('Connection failed:', err.message)
    process.exit(1)
  } finally {
    if (connection) await connection.close()
  }
}

migrate()
