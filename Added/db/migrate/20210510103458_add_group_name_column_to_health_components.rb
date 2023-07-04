class AddGroupNameColumnToHealthComponents < ActiveRecord::Migration[5.2]
  def self.up
    execute 'alter table health_components
             add column group_name character varying(255);'
  end

  def self.down
    execute 'alter table health_components
             drop column if exists group_name;'
  end
end
