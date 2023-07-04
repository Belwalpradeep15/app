class RemoveAllButLastRetriggerAlertResponses < ActiveRecord::Migration[5.2]
  def self.up
    execute <<-SQL
      delete from alert_responses ar
      where ar.response = 'retrigger';
    SQL
  end

  def self.down
  end
end
