import oracledb from 'oracledb'

// oracledb v6+ uses thin mode by default — no Oracle Instant Client required
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT

let pool = null

async function getPool() {
  if (!pool) {
    pool = await oracledb.createPool({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      connectString: process.env.DB_CONNECT_STRING,
      poolMin: 2,
      poolMax: 10,
      poolIncrement: 1,
    })
  }
  return pool
}

export async function query(sql, binds = [], options = {}) {
  const p = await getPool()
  const connection = await p.getConnection()
  try {
    const result = await connection.execute(sql, binds, options)
    return result.rows ?? []
  } finally {
    await connection.close()
  }
}

export async function execute(sql, binds = [], options = {}) {
  const p = await getPool()
  const connection = await p.getConnection()
  try {
    const result = await connection.execute(sql, binds, { autoCommit: true, ...options })
    return result
  } finally {
    await connection.close()
  }
}

// Run multiple statements on the same connection so we can see uncommitted changes
// (useful for diagnosing trigger behaviour). Commits on success, rolls back on error.
export async function transaction(fn) {
  const p = await getPool()
  const connection = await p.getConnection()
  try {
    const result = await fn(connection)
    await connection.commit()
    return result
  } catch (err) {
    await connection.rollback().catch(() => {})
    throw err
  } finally {
    await connection.close()
  }
}
