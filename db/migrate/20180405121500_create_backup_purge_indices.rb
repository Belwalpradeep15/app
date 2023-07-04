# Create indices that significantly speed up the backup/purge scripts.
# These are provided by Paul, see #19215.
# The index names are his, which deviate from our convention, but are nonetheless used, as these indexes do already exist on some machines.

class CreateBackupPurgeIndices < ActiveRecord::Migration[5.2]
  def self.up
    execute <<-sql
DROP INDEX IF EXISTS fki_fk_alert_details_alert_id;
DROP INDEX IF EXISTS fki_fk_alert_responses_alert_id;
DROP INDEX IF EXISTS fki_fk_alerts_alert_maintainer_id;
DROP INDEX IF EXISTS fki_fk_event_tracks_alert_id;
DROP INDEX IF EXISTS fki_fk_events_alert_id;

CREATE INDEX fki_fk_alert_details_alert_id ON alert_details (alert_id);
CREATE INDEX fki_fk_alert_responses_alert_id ON alert_responses (alert_id);
CREATE INDEX fki_fk_alerts_alert_maintainer_id ON alerts (alert_maintainer_id);
CREATE INDEX fki_fk_event_tracks_alert_id ON event_tracks (alert_id);
CREATE INDEX fki_fk_events_alert_id ON events (alert_id);
    sql
  end

  def self.down
    execute <<-sql
DROP INDEX fki_fk_alert_details_alert_id;
DROP INDEX fki_fk_alert_responses_alert_id;
DROP INDEX fki_fk_alerts_alert_maintainer_id;
DROP INDEX fki_fk_event_tracks_alert_id;
DROP INDEX fki_fk_events_alert_id;
    sql
  end
end
