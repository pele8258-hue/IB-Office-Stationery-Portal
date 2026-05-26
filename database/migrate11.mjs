import oracledb from 'oracledb'
import { config } from 'dotenv'

config()

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT

const statements = [
  `CREATE TABLE email_notifications (
    id                NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    vehicle_id        NUMBER        NOT NULL,
    document_id       NUMBER        NOT NULL,
    notification_type VARCHAR2(10)  NOT NULL,
    sent_to           VARCHAR2(255) NOT NULL,
    status            VARCHAR2(10)  DEFAULT 'SENT' NOT NULL,
    error_message     VARCHAR2(1000),
    sent_at           TIMESTAMP     DEFAULT SYSTIMESTAMP,
    CONSTRAINT fk_en_vehicle  FOREIGN KEY (vehicle_id)  REFERENCES vehicles(id)          ON DELETE CASCADE,
    CONSTRAINT fk_en_document FOREIGN KEY (document_id) REFERENCES vehicle_documents(id) ON DELETE CASCADE,
    CONSTRAINT chk_en_type    CHECK (notification_type IN ('2_MONTHS', '1_MONTH', '1_WEEK', 'EXPIRED')),
    CONSTRAINT chk_en_status  CHECK (status IN ('SENT', 'FAILED'))
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
    console.log('\nMigration 011 complete.')
  } catch (err) {
    console.error('Connection failed:', err.message)
    process.exit(1)
  } finally {
    if (connection) await connection.close()
  }
}

migrate()
