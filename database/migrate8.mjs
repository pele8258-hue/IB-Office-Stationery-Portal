import oracledb from 'oracledb'
import bcrypt from 'bcryptjs'
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

    // Get branch id and role id
    const branches = await connection.execute(`SELECT id FROM branches WHERE code = '010'`)
    const roles    = await connection.execute(`SELECT id FROM roles WHERE code = 'SUPER_ADMIN'`)
    const depts    = await connection.execute(`SELECT id FROM departments WHERE code = 'IT_OPERATION'`)

    const branchId = branches.rows[0]?.ID
    const roleId   = roles.rows[0]?.ID
    const deptId   = depts.rows[0]?.ID

    if (!branchId || !roleId || !deptId) {
      console.error('FAIL — Could not find branch, role, or department. Run previous migrations first.')
      process.exit(1)
    }

    const password = await bcrypt.hash('Admin@1234', 12)

    await connection.execute(
      `INSERT INTO staff (name, email, password, position, job_title, branch_id, department_id, role_id, status)
       VALUES (:name, :email, :password, :position, :job_title, :branch_id, :department_id, :role_id, 'A')`,
      {
        name:          'Super Admin',
        email:         'admin@adminsvs.com',
        password,
        position:      'IT Administrator',
        job_title:     'System Administrator',
        branch_id:     branchId,
        department_id: deptId,
        role_id:       roleId,
      },
      { autoCommit: true }
    )

    console.log('OK  Super Admin created.')
    console.log('\nLogin credentials:')
    console.log('  Email   : admin@adminsvs.com')
    console.log('  Password: Admin@1234')
    console.log('\nMigration complete.')
  } catch (err) {
    if (err.errorNum === 1) {
      console.log('SKIP — Super Admin already exists.')
    } else {
      console.error('FAIL —', err.message)
    }
  } finally {
    if (connection) await connection.close()
  }
}

migrate()
