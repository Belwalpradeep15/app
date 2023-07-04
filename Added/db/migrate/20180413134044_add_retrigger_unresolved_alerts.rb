class AddRetriggerUnresolvedAlerts < ActiveRecord::Migration[5.2]
  def self.up
    # provide suitable defaults
    defaults = {'alerts_retrigger_enabled' => 'false',
        'alerts_retrigger_minutes' => '10'}

    prefs = ActiveRecord::Base.connection.select_all("select * from system_preferences")

    defaults.each_pair do |key, value|
      unless prefs.find{|x| x['key'] == key}
        # only insert if it doesn't exist
        execute <<-SQL
          INSERT INTO system_preferences (key, value, created_at)
          VALUES ('#{key}', '#{value}', now() at time zone 'UTC');
        SQL
      end
    end
    
  end

  def self.down
    execute <<-SQL
      DELETE FROM system_preferences WHERE key = 'alerts_retrigger_enabled';
      DELETE FROM system_preferences WHERE key = 'alerts_retrigger_minutes';
    SQL
  end
end
