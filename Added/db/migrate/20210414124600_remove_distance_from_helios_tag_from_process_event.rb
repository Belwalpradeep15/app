class RemoveDistanceFromHeliosTagFromProcessEvent < ActiveRecord::Migration[5.2]
  def self.up
  	execute File.read('db/procedures/process_event.14.sql')
  end

  def self.down
  	execute File.read('db/procedures/process_event.13.sql')
  end
end
