class AddEventaggregationenabledToThreatConfigurations < ActiveRecord::Migration[5.2]
  def self.up
    add_column :threat_configurations, :event_aggregation_enabled, :boolean, :default => false, :null => false
  end

  def self.down
    remove_column :threat_configurations, :event_aggregation_enabled
  end
end
