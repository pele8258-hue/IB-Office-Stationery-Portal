import oracledb from 'oracledb'
import { config } from 'dotenv'

config()

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT

const statements = [
  // 1. role_resources table — bridges roles to resources with 4 permission flags
  `CREATE TABLE role_resources (
    id          NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    role_id     NUMBER    NOT NULL,
    resource_id NUMBER    NOT NULL,
    can_view    NUMBER(1) DEFAULT 0 NOT NULL,
    can_create  NUMBER(1) DEFAULT 0 NOT NULL,
    can_edit    NUMBER(1) DEFAULT 0 NOT NULL,
    can_delete  NUMBER(1) DEFAULT 0 NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_role_resource  UNIQUE (role_id, resource_id),
    CONSTRAINT fk_rr_role        FOREIGN KEY (role_id)     REFERENCES roles(id),
    CONSTRAINT fk_rr_resource    FOREIGN KEY (resource_id) REFERENCES resources(id),
    CONSTRAINT chk_rr_view       CHECK (can_view   IN (0, 1)),
    CONSTRAINT chk_rr_create     CHECK (can_create IN (0, 1)),
    CONSTRAINT chk_rr_edit       CHECK (can_edit   IN (0, 1)),
    CONSTRAINT chk_rr_delete     CHECK (can_delete IN (0, 1))
  )`,

  // 2. Seed REPORTS resource
  `INSERT INTO resources (name, code, module, description)
   VALUES ('Vehicle Reports', 'REPORTS', 'ADMIN', 'Access to vehicle request and department reports')`,
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
      const label = sql.trim().split('\n')[0].trim().substring(0, 80)
      try {
        await connection.execute(sql, [], { autoCommit: true })
        console.log(`OK    ${label}`)
      } catch (err) {
        if (err.errorNum === 955) {
          console.log(`SKIP  (already exists)  ${label}`)
        } else if (err.errorNum === 1) {
          console.log(`SKIP  (duplicate)  ${label}`)
        } else {
          console.error(`FAIL  ${label}`)
          console.error(`      ${err.message}`)
        }
      }
    }

    console.log('\nMigration 016 complete.')
  } catch (err) {
    console.error('Connection failed:', err.message)
    process.exit(1)
  } finally {
    if (connection) await connection.close()
  }
}

migrate()
