class ThreatHandlerSupport < ActiveRecord::Migration[5.2]
  def self.up
	  # Add an alert maintainer to represent the ThreatHandlerModule.
	  execute <<-SQL
		  INSERT INTO alert_maintainers(name, description, created_at)
		  VALUES ('threathandler', 'handled by the threat handler module', now() at time zone 'UTC');
	  SQL
  end

  def self.down
	# Remove the alert maintainer.
	execute <<-SQL
		UPDATE alerts
		SET alert_maintainer_id = NULL,
			updated_at = now() at time zone 'UTC'
		WHERE alert_maintainer_id = (SELECT id FROM alert_maintainers WHERE name = 'threathandler');

		DELETE FROM alert_maintainers WHERE name = 'threathandler';
	SQL
  end
end
