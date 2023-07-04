class RenameAlertsRequireAcknowledgementSystemPreference < ActiveRecord::Migration[5.2]
  def self.up
    execute <<-SQL
      UPDATE system_preferences
      SET key = 'alerts_require_comment_text'
      WHERE key = 'alerts-require-acknowledgement';
    SQL
  end

  def self.down
    execute <<-SQL
      UPDATE system_preferences
      SET key = 'alerts-require-acknowledgement'
      WHERE key = 'alerts_require_comment_text';
    SQL
  end
end
