import oracledb from 'oracledb'
import { config } from 'dotenv'

config()

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT

async function fix() {
  let connection
  try {
    connection = await oracledb.getConnection({
      user:          process.env.DB_USER,
      password:      process.env.DB_PASSWORD,
      connectString: process.env.DB_CONNECT_STRING,
    })
    console.log('Connected\n')

    // Drop existing invalid trigger
    try {
      await connection.execute(`DROP TRIGGER trg_vrequest_request_no`, [], { autoCommit: true })
      console.log('OK  DROP TRIGGER trg_vrequest_request_no')
    } catch (e) {
      console.log('SKIP drop:', e.message)
    }

    // Recreate with correct PL/SQL syntax
    await connection.execute(
      `CREATE OR REPLACE TRIGGER trg_vrequest_request_no
       BEFORE INSERT ON vehicle_requests
       FOR EACH ROW
       BEGIN
         :NEW.request_no := 'VR-' || TO_CHAR(SYSDATE, 'DDMMYYYYHH24MI');
       END;`,
      [],
      { autoCommit: true }
    )
    console.log('OK  CREATE OR REPLACE TRIGGER trg_vrequest_request_no')

    // Verify it is valid
    const check = await connection.execute(
      `SELECT status FROM user_objects WHERE object_name = 'TRG_VREQUEST_REQUEST_NO'`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    )
    console.log('\nTrigger status:', check.rows[0]?.STATUS)

  } catch (err) {
    console.error('Error:', err.message)
  } finally {
    if (connection) await connection.close()
  }
}

fix()
