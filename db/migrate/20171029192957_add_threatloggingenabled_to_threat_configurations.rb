class AddThreatloggingenabledToThreatConfigurations < ActiveRecord::Migration[5.2]
  def self.up
    add_column :threat_configurations, :logging_enabled, :boolean, :default => true, :null => false
  end

  def self.down
    remove_column :threat_configurations, :logging_enabled
  end
end
