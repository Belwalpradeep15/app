class AddWheelSensorEventType < ActiveRecord::Migration[5.2]
  def self.new_event_types
    { #event_name => category
      :wheel_sensor => :railway
    }
  end

  def self.up
  	new_event_types.each do |event_name, category|
      execute <<-SQL
        INSERT INTO event_types(name, event_category_id, created_at, updated_at)
        VALUES ('#{event_name}',
                (SELECT id FROM event_categories WHERE name = '#{category}'),
                now() at time zone 'UTC',
                now() at time zone 'UTC');
      SQL
    end
  end

  def self.down
    event_name_list = new_event_types.keys.collect{|x| "'#{x}'"}.join(',')
    execute <<-SQL
      UPDATE  threat_configurations
      SET     event_type_id = (SELECT id FROM event_types WHERE name = 'unknown'),
      updated_at = now() at time zone 'UTC'
      WHERE   event_type_id in (SELECT id FROM event_types WHERE name in (#{event_name_list}));

      UPDATE  event_tracks
      SET     event_type_id = (SELECT id FROM event_types WHERE name = 'unknown'),
      updated_at = now() at time zone 'UTC'
      WHERE   event_type_id in (SELECT id FROM event_types WHERE name in (#{event_name_list}));

      UPDATE  events
      SET     event_type_id = (SELECT id FROM event_types WHERE name = 'unknown'),
      updated_at = now() at time zone 'UTC'
      WHERE   event_type_id in (SELECT id FROM event_types WHERE name in (#{event_name_list}));

      DELETE FROM event_types
      WHERE name in (#{event_name_list});
    SQL
  end
end
