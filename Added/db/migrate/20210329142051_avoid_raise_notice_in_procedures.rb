class AvoidRaiseNoticeInProcedures < ActiveRecord::Migration[5.2]
  def self.up
    execute File.read('db/procedures/fotech_alerts_notification_pending_notifier.01.sql')
    execute File.read('db/procedures/fotech_config_changes_notifier.01.sql')
    execute File.read('db/procedures/fotech_id_deletes_notifier.01.sql')
  end

  def self.down
    execute File.read('db/procedures/fotech_alerts_notification_pending_notifier.00.sql')
    execute File.read('db/procedures/fotech_config_changes_notifier.00.sql')
    execute File.read('db/procedures/fotech_id_deletes_notifier.00.sql')
  end
end
