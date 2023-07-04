class TimeZoneQueryModificationsInProcessEventsql < ActiveRecord::Migration[5.2]
  def self.up
  	execute File.read('db/procedures/process_event.12.sql')
  end

  def self.down
  	execute File.read('db/procedures/process_event.11.sql')
  end
end
