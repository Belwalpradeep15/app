class AddUuidToAlerts < ActiveRecord::Migration[5.2]
  def self.up
    execute 'create extension if not exists "uuid-ossp";'
    execute 'alter table alerts
             add column uuid uuid not null default uuid_generate_v4();'
    execute 'create unique index alerts_by_uuid on alerts(uuid);'
  end

  def self.down
    execute 'drop index if exists alerts_by_uuid;'
    execute 'alter table alerts
             drop column if exists uuid;'
    execute 'drop extension if exists "uuid-ossp";'
  end
end
