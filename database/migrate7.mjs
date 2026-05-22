import oracledb from 'oracledb'
import { config } from 'dotenv'

config()

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT

async function migrate() {
  let connection
  try {
    connection = await oracledb.getConnection({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      connectString: process.env.DB_CONNECT_STRING,
    })

    console.log('Connected to Oracle DB\n')

    await connection.execute(
      `INSERT INTO branches (name, code, type) VALUES (:name, :code, :type)`,
      { name: 'Main Branch', code: '010', type: 'HEAD' },
      { autoCommit: true }
    )

    console.log('OK  Main Branch (010) inserted.')
    console.log('\nMigration complete.')
  } catch (err) {
    if (err.errorNum === 1) {
      console.log('SKIP — Main Branch (010) already exists.')
    } else {
      console.error('FAIL —', err.message)
    }
  } finally {
    if (connection) await connection.close()
  }
}

migrate()
