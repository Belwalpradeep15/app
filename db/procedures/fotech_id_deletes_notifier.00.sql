/*
fotech_id_deletes_notifier.sql

This file is Copyright © 2019 Fotech Solutions Ltd. All rights reserved.

This function is a trigger attached to tables, to send a notify, when a row in the table is deleted.
*/

create or replace function fotech_id_deletes_notifier()
returns trigger
language plpgsql
as $$
begin
    perform pg_notify('id_deleted', 'table_name=' || tg_table_name || ';id=' || old.id);
    raise notice 'id_deleted: tg_table_name: %, old.id: %', tg_table_name, old.id;
    return null;
end;
$$;
