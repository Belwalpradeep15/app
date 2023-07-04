=begin

This migration enables our triggers to always run.
Otherwise in a bucardo setup, when a sync occurs to a target machine, the trigger doesn't run there, and controld doesn't see the change. See #23356.

I've got all existing tables with our triggers as follows:

fotechdev_production=# select distinct(event_object_table) from information_schema.triggers where trigger_name='fotech_config_changes_notifier_trigger';
    event_object_table
--------------------------
 system_preferences
 threat_thresholds
 users
 event_types
 threat_increments
 fibre_lines
 threat_configurations
 alert_configurations
 refresh
 organization_preferences
 organizations
 panoptes_units
 helios_units
(13 rows)

fotechdev_production=# select distinct(event_object_table) from information_schema.triggers where trigger_name='fotech_id_deletes_notifier_trigger';
 event_object_table
--------------------
 alerts
(1 row)

fotechdev_production=# select distinct(event_object_table) from information_schema.triggers where trigger_name='fotech_alerts_notification_pending_notifier_trigger';
 event_object_table
--------------------
 alerts
(1 row)


Note: The pgAdmin UI seems to be unreliable in showing the enable'ness of the trigger, so using the \dS in psql is recommended, like so:
fotechdev_production=# \dS helios_units
...
Triggers:
    bucardo_delta AFTER INSERT OR DELETE OR UPDATE ON helios_units FOR EACH ROW EXECUTE PROCEDURE bucardo.delta_public_helios_units()
    bucardo_kick_sync_configs AFTER INSERT OR DELETE OR UPDATE OR TRUNCATE ON helios_units FOR EACH STATEMENT EXECUTE PROCEDURE bucardo.bucardo_kick_sync_configs()
    bucardo_note_trunc_sync_configs AFTER TRUNCATE ON helios_units FOR EACH STATEMENT EXECUTE PROCEDURE bucardo.bucardo_note_truncation('sync_configs')
Triggers firing always:
    fotech_config_changes_notifier_trigger AFTER INSERT OR DELETE OR UPDATE ON helios_units FOR EACH STATEMENT EXECUTE PROCEDURE fotech_config_changes_notifier()

=end

class EnableAlwaysOurTriggers < ActiveRecord::Migration[5.2]
    def self.tables_with_fotech_config_changes_notifier_trigger
        %w(
            system_preferences
            threat_thresholds
            users
            event_types
            threat_increments
            fibre_lines
            threat_configurations
            alert_configurations
            refresh
            organization_preferences
            organizations
            panoptes_units
            helios_units
        )
    end

    def self.up
        self.tables_with_fotech_config_changes_notifier_trigger.each do |t|
            execute <<-sql
                ALTER TABLE #{t} ENABLE ALWAYS TRIGGER fotech_config_changes_notifier_trigger;
            sql
        end
        execute <<-sql
            ALTER TABLE alerts ENABLE ALWAYS TRIGGER fotech_id_deletes_notifier_trigger;
            ALTER TABLE alerts ENABLE ALWAYS TRIGGER fotech_alerts_notification_pending_notifier_trigger;
        sql
    end

    def self.down
        # Go back to the default/plain ENABLE.
        self.tables_with_fotech_config_changes_notifier_trigger.each do |t|
            execute <<-sql
                ALTER TABLE #{t} ENABLE TRIGGER fotech_config_changes_notifier_trigger;
            sql
        end
        execute <<-sql
            ALTER TABLE alerts ENABLE TRIGGER fotech_id_deletes_notifier_trigger;
            ALTER TABLE alerts ENABLE TRIGGER fotech_alerts_notification_pending_notifier_trigger;
        sql
    end

end
