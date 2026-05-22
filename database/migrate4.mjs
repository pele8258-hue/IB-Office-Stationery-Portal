import oracledb from 'oracledb'
import { config } from 'dotenv'

config()

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT

const statements = [
  `CREATE TABLE vehicle_requests (
    id                   NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    vehicle_id           NUMBER         NOT NULL,
    staff_id             NUMBER         NOT NULL,
    driver_id            NUMBER,
    purpose              VARCHAR2(255),
    destination          VARCHAR2(255),
    passenger_count      NUMBER(3)      DEFAULT 0,
    request_date         TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
    requested_time_out   TIMESTAMP      NOT NULL,
    requested_time_in    TIMESTAMP      NOT NULL,
    actual_time_out      TIMESTAMP,
    actual_time_in       TIMESTAMP,
    meter_before         NUMBER(10,1),
    meter_after          NUMBER(10,1),
    meter_image_before   VARCHAR2(500),
    meter_image_after    VARCHAR2(500),
    approved_by          NUMBER,
    approved_at          TIMESTAMP,
    rejected_by          NUMBER,
    rejected_at          TIMESTAMP,
    reject_reason        VARCHAR2(500),
    status               VARCHAR2(15)   DEFAULT 'PENDING' NOT NULL,
    notes                VARCHAR2(500),
    created_by           NUMBER,
    updated_by           NUMBER,
    created_at           TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_vr_status     CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'IN_USE', 'COMPLETED', 'CANCELLED')),
    CONSTRAINT fk_vr_vehicle     FOREIGN KEY (vehicle_id)  REFERENCES vehicles(id),
    CONSTRAINT fk_vr_staff       FOREIGN KEY (staff_id)    REFERENCES staff(id),
    CONSTRAINT fk_vr_driver      FOREIGN KEY (driver_id)   REFERENCES staff(id),
    CONSTRAINT fk_vr_approved_by FOREIGN KEY (approved_by) REFERENCES staff(id),
    CONSTRAINT fk_vr_rejected_by FOREIGN KEY (rejected_by) REFERENCES staff(id),
    CONSTRAINT fk_vr_created_by  FOREIGN KEY (created_by)  REFERENCES staff(id),
    CONSTRAINT fk_vr_updated_by  FOREIGN KEY (updated_by)  REFERENCES staff(id)
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
