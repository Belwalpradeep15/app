class AddFotechConfigChangesNotifierTriggerToPanoptesUnits  < ActiveRecord::Migration[5.2]
  def self.tables_needing_triggers
    [
      'panoptes_units'
    ]
  end

  def self.up
    self.tables_needing_triggers.each do |t|
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
    # Drops the trigger on tables.
    self.tables_needing_triggers.each do |t|
      execute <<-sql
        drop trigger if exists fotech_config_changes_notifier_trigger on #{t};
      sql
    end
  end
end
