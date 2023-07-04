class AddFotechIdDeletesNotifierAndTriggers < ActiveRecord::Migration[5.2]
  def self.up
    ActiveRecord::Base.connection.execute File.read('db/procedures/fotech_id_deletes_notifier.00.sql')

    tables_needing_triggers = [
        'alerts'
    ]

    tables_needing_triggers.each do |t|
      execute <<-sql
        create trigger fotech_id_deletes_notifier_trigger
        after delete
        on alerts
        for each row
        execute procedure fotech_id_deletes_notifier();
      sql
    end
  end

  def self.down
    # Drops the function and triggers on tables using it.
    execute <<-sql
      -- No need of this, as dropping the function with cascade should be enough.
      -- drop trigger if exists fotech_id_deletes_notifier_trigger on alerts;
      drop function fotech_id_deletes_notifier() cascade;
    sql
  end
end
