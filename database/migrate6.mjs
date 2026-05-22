import oracledb from 'oracledb'
import { config } from 'dotenv'

config()

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT

const departments = [
  ['President',                               'PRESIDENT'],
  ['Managing Director',                       'MANAGING_DIRECTOR'],
  ['Senior Deputy Managing Director',         'SR_DEPUTY_MD'],
  ['Deputy Managing Director',                'DEPUTY_MD'],
  ['Tech & Enablement Division',              'TECH_ENABLEMENT'],
  ['Branch Operation Division',               'BRANCH_OPERATION'],
  ['Marketing & Product Development Division','MKT_PRODUCT_DEV_DIV'],
  ['Sales & Business Development Division',   'SALES_BIZ_DEV_DIV'],
  ['Business Unit Supervision',               'BUS_UNIT_SUP'],
  ['Main Branch',                             'MAIN_BRANCH'],
  ['Business Unit Supervision - GM & Sales',  'BUS_UNIT_SUP_GM'],
  ['Business Unit Supervision - CM & Sales',  'BUS_UNIT_SUP_CM'],
  ['VIP Service',                             'VIP_SERVICE'],
  ['Sales',                                   'SALES'],
  ['Marketing & Product Development',         'MARKETING_PRODUCT'],
  ['Public Relation',                         'PUBLIC_RELATION'],
  ['IT Operation',                            'IT_OPERATION'],
  ['IT Planning',                             'IT_PLANNING'],
  ['IT Software Development',                 'IT_SOFTWARE_DEV'],
  ['E-Banking Service',                       'E_BANKING'],
  ['Digital',                                 'DIGITAL'],
  ['Treasury, Trade & Payment',               'TREASURY_TRADE'],
  ['Commercial Loan',                         'COMMERCIAL_LOAN'],
  ['Auto Finance',                            'AUTO_FINANCE'],
  ['Administration',                          'ADMINISTRATION'],
  ['Human Resources',                         'HUMAN_RESOURCES'],
  ['Risk',                                    'RISK'],
  ['Internal Audit',                          'INTERNAL_AUDIT'],
  ['Finance & Accounting',                    'FINANCE_ACCOUNTING'],
  ['Compliance',                              'COMPLIANCE'],
  ['Trainee - Business Unit Supervision',     'TRAINEE_BUS_UNIT'],
  ['Trainee - IT Operation',                  'TRAINEE_IT'],
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

    for (const [name, code] of departments) {
      try {
        await connection.execute(
          `INSERT INTO departments (name, code) VALUES (:name, :code)`,
          { name, code },
          { autoCommit: true }
        )
        console.log(`OK  ${code}`)
      } catch (err) {
        if (err.errorNum === 1) {
          console.log(`SKIP (already exists)  ${code}`)
        } else {
          console.error(`FAIL  ${code} — ${err.message}`)
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
