-- ============================================================
-- Migration : 006_seed_departments.sql
-- Description: Seed department table from org chart
-- Author     : PELAY
-- Date       : 2026-05-20
-- ============================================================

INSERT INTO departments (name, code) VALUES ('President',                              'PRESIDENT');
INSERT INTO departments (name, code) VALUES ('Managing Director',                      'MANAGING_DIRECTOR');
INSERT INTO departments (name, code) VALUES ('Senior Deputy Managing Director',        'SR_DEPUTY_MD');
INSERT INTO departments (name, code) VALUES ('Deputy Managing Director',               'DEPUTY_MD');
INSERT INTO departments (name, code) VALUES ('Tech & Enablement Division',             'TECH_ENABLEMENT');
INSERT INTO departments (name, code) VALUES ('Branch Operation Division',              'BRANCH_OPERATION');
INSERT INTO departments (name, code) VALUES ('Marketing & Product Development Division','MKT_PRODUCT_DEV_DIV');
INSERT INTO departments (name, code) VALUES ('Sales & Business Development Division',  'SALES_BIZ_DEV_DIV');
INSERT INTO departments (name, code) VALUES ('Business Unit Supervision',              'BUS_UNIT_SUP');
INSERT INTO departments (name, code) VALUES ('Main Branch',                            'MAIN_BRANCH');
INSERT INTO departments (name, code) VALUES ('Business Unit Supervision - GM & Sales', 'BUS_UNIT_SUP_GM');
INSERT INTO departments (name, code) VALUES ('Business Unit Supervision - CM & Sales', 'BUS_UNIT_SUP_CM');
INSERT INTO departments (name, code) VALUES ('VIP Service',                            'VIP_SERVICE');
INSERT INTO departments (name, code) VALUES ('Sales',                                  'SALES');
INSERT INTO departments (name, code) VALUES ('Marketing & Product Development',        'MARKETING_PRODUCT');
INSERT INTO departments (name, code) VALUES ('Public Relation',                        'PUBLIC_RELATION');
INSERT INTO departments (name, code) VALUES ('IT Operation',                           'IT_OPERATION');
INSERT INTO departments (name, code) VALUES ('IT Planning',                            'IT_PLANNING');
INSERT INTO departments (name, code) VALUES ('IT Software Development',                'IT_SOFTWARE_DEV');
INSERT INTO departments (name, code) VALUES ('E-Banking Service',                      'E_BANKING');
INSERT INTO departments (name, code) VALUES ('Digital',                                'DIGITAL');
INSERT INTO departments (name, code) VALUES ('Treasury, Trade & Payment',              'TREASURY_TRADE');
INSERT INTO departments (name, code) VALUES ('Commercial Loan',                        'COMMERCIAL_LOAN');
INSERT INTO departments (name, code) VALUES ('Auto Finance',                           'AUTO_FINANCE');
INSERT INTO departments (name, code) VALUES ('Administration',                         'ADMINISTRATION');
INSERT INTO departments (name, code) VALUES ('Human Resources',                        'HUMAN_RESOURCES');
INSERT INTO departments (name, code) VALUES ('Risk',                                   'RISK');
INSERT INTO departments (name, code) VALUES ('Internal Audit',                         'INTERNAL_AUDIT');
INSERT INTO departments (name, code) VALUES ('Finance & Accounting',                   'FINANCE_ACCOUNTING');
INSERT INTO departments (name, code) VALUES ('Compliance',                             'COMPLIANCE');
INSERT INTO departments (name, code) VALUES ('Trainee - Business Unit Supervision',    'TRAINEE_BUS_UNIT');
INSERT INTO departments (name, code) VALUES ('Trainee - IT Operation',                 'TRAINEE_IT');

COMMIT;
