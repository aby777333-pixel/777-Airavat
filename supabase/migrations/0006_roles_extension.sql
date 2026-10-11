-- AIRAVAT | Migration 0006: additional staff and partner roles (enum values must commit before use)
alter type app_role add value if not exists 'finance';
alter type app_role add value if not exists 'editor';
alter type app_role add value if not exists 'sales';
alter type app_role add value if not exists 'partner';
