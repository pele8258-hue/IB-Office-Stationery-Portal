import oracledb from 'oracledb'
import { config } from 'dotenv'

config()

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT

const statements = [
  `CREATE TABLE vehicles (
    id                   NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    plate_number         VARCHAR2(20)   NOT NULL,
    part_number          VARCHAR2(100),
    engine_number        VARCHAR2(100),
    frame_number         VARCHAR2(100),
    brand                VARCHAR2(100),
    model                VARCHAR2(100),
    color                VARCHAR2(50),
    year                 NUMBER(4),
    type                 VARCHAR2(20),
    ownership_type       VARCHAR2(10)   DEFAULT 'OWN' NOT NULL,
    vehicle_document     VARCHAR2(500),
    parking_lot          VARCHAR2(50),
    parking_floor        VARCHAR2(10),
    road_tax_expiry      DATE,
    road_tax_document    VARCHAR2(500),
    insurance_expiry     DATE,
    insurance_document   VARCHAR2(500),
    lease_expiry         DATE,
    lease_document       VARCHAR2(500),
    owner_name           VARCHAR2(150),
    owner_email          VARCHAR2(150),
    owner_phone          VARCHAR2(20),
    owner_dob            DATE,
    branch_id            NUMBER         NOT NULL,
    status               VARCHAR2(20)   DEFAULT 'AVAILABLE' NOT NULL,
    created_by           NUMBER,
    updated_by           NUMBER,
    created_at           TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_vehicle_plate      UNIQUE (plate_number),
    CONSTRAINT chk_vehicle_status    CHECK (status         IN ('AVAILABLE', 'IN_USE', 'MAINTENANCE', 'LEASE_EXPIRED')),
    CONSTRAINT chk_vehicle_type      CHECK (type           IN ('SEDAN', 'VAN', 'TRUCK', 'SUV', 'PICKUP', 'OTHER')),
    CONSTRAINT chk_vehicle_ownership CHECK (ownership_type IN ('OWN', 'LEASE')),
    CONSTRAINT fk_vehicle_branch     FOREIGN KEY (branch_id)  REFERENCES branches(id),
    CONSTRAINT fk_vehicle_created    FOREIGN KEY (created_by) REFERENCES staff(id),
    CONSTRAINT fk_vehicle_updated    FOREIGN KEY (updated_by) REFERENCES staff(id)
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
