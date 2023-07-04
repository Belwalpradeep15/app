class AddFotechAlertsNotificationPendingNotifierAndTrigger < ActiveRecord::Migration[5.2]
  def self.up
    ActiveRecord::Base.connection.execute File.read('db/procedures/fotech_alerts_notification_pending_notifier.00.sql')

    execute <<-sql
      create trigger fotech_alerts_notification_pending_notifier_trigger
      after insert or update
      on alerts
      for each row
      execute procedure fotech_alerts_notification_pending_notifier();
    sql
  end

  def self.down
    # Drops the function and triggers on tables using it.
    execute <<-sql
      -- No need of this, as dropping the function with cascade should be enough.
      -- drop trigger if exists fotech_alerts_notification_pending_notifier on alerts;
      drop function fotech_alerts_notification_pending_notifier() cascade;
    sql
  end
end
