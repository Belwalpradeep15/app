class AddFotechConfigChangesNotifierAndTriggers  < ActiveRecord::Migration[5.2]
  def self.up
    ActiveRecord::Base.connection.execute File.read('db/procedures/fotech_config_changes_notifier.00.sql')

    tables_needing_triggers = [
      'helios_units',
      'fibre_lines',
      'event_types',
      'alert_configurations',
      'threat_configurations',
      'threat_increments',
      'threat_thresholds'
    ]

    tables_needing_triggers.each do |t|
      execute <<-sql
        create trigger fotech_config_changes_notifier_trigger
        after insert or update or delete
        on #{t}
        for each statement
        execute procedure fotech_config_changes_notifier();
      sql
    end
  end

  def self.down
    # Drops the function and triggers on tables using it.
    execute <<-sql
      drop function fotech_config_changes_notifier() cascade;
    sql
  end
end
