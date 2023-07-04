/*
fotech_config_changes_notifier.sql

This file is Copyright © 2019 Fotech Solutions Ltd. All rights reserved.

This function is a trigger attached to tables, to send a notify, when the table changes.
*/

create or replace function fotech_config_changes_notifier()
returns trigger
language plpgsql
as $$
begin
    perform pg_notify('config_changed', 'table_name=' || tg_table_name);
    raise debug 'tg_table_name: %', tg_table_name;
    return null;
end;
$$;
