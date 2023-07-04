/*
fotech_alerts_notification_pending_notifier.sql

This file is Copyright © 2019 Fotech Solutions Ltd. All rights reserved.

This function is a trigger attached to tables, to send a notify, when the table changes.
*/

create or replace function fotech_alerts_notification_pending_notifier()
returns trigger
language plpgsql
as $$
begin
    if tg_op = 'INSERT' then
        if new.notification_pending is true or new.notification_pending2 is true then
            perform pg_notify('notification_pending', 'index1=' || new.notification_pending || ';index2=' || new.notification_pending2);
            raise notice 'notification_pending: insert';
        end if;
    elsif (tg_op = 'UPDATE') then
        if (new.notification_pending is true and new.notification_pending != old.notification_pending) or (new.notification_pending2 is true and new.notification_pending2 != old.notification_pending2) then
            perform pg_notify('notification_pending', 'index1=' || new.notification_pending || ';index2=' || new.notification_pending2);
            raise notice 'notification_pending: update';
        end if;
    end if;
    return null;
end;
$$;
