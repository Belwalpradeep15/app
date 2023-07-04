# This is the original, pre-rails522 Rakefile, that I have converted to a '.rake' file
# And introduced a 'fotech' namespace.

# Add your own tasks in files placed in lib/tasks ending in .rake,
# for example lib/tasks/capistrano.rake, and they will automatically be available to Rake.

# require 'thread'
# require(File.join(File.dirname(__FILE__), 'config', 'boot'))
#
# require 'rake'
# require 'rake/testtask'
# require 'rdoc/task'
# require 'rake/task'
#
# require 'tasks/rails'
#
# require 'shoulda/tasks'
# namespace :test do
#   desc 'Measures test coverage'
#   task :coverage do
#     rm_f "coverage"
#     rm_f "coverage.data"
#     rcov = "rcov -Itest --rails --aggregate coverage.data -T -x \" rubygems/*,/Library/Ruby/Site/*,gems/*,rcov*\""
#     system("#{rcov} --no-html test/unit/*_test.rb test/unit/helpers/*/*_test.rb")
#     system("#{rcov} --no-html test/functional/*/*_test.rb")
#     system("#{rcov} --html test/integration/*/*_test.rb")
#     system("open coverage/index.html") if PLATFORM['darwin']
#   end
# end


namespace :fotech do

# Setup server with odd or even ids.

# All tables of fotechdev_production
# table_name, case, options
# case is one of: ignore, standard_PK, create_PK, existing_PK
# For standard_PK, the "id" column is the assumed primary key.
# For create_PK, options includes the multiple primary key names.
@all_tables=[
#['schema_migrations',               'ignore'],
#['spatial_ref_sys',                 'existing_PK'],
#['geometry_columns',                'existing_PK'],
#This is a view and should not be sync'ed.
#['geography_columns',               'create_PK', 'coord_dimension', 'srid'],
#['tz_world',                        'existing_PK'],
#['fibre_shots',                     'standard_PK'],
#['time_series',                     'standard_PK'],
['apps',                            'standard_PK'],
#['apps_event_categories',           'create_PK', 'event_category_id', 'app_id'],
['alert_details',                   'standard_PK'],
['alert_maintainers',               'standard_PK'],
['roles', 'standard_PK'],
#['event_categories_fibre_lines',    'create_PK', 'event_category_id', 'fibre_line_id'],
['fibre_regions',                   'standard_PK'],
['fibre_region_types',              'standard_PK'],
['preferences',                     'standard_PK'],
['events',                          'standard_PK'],
['event_categories',                'standard_PK'],
['sessions',                        'standard_PK'],
['users',                           'standard_PK'],
['display_types',                   'standard_PK'],
#['roles_users',                     'create_PK', 'role_id', 'user_id'],
['organizations',                   'standard_PK'],
#['organizations_users',            'create_PK', 'organization_id', 'user_id'],
['event_types',                     'standard_PK'],
#This table should NOT be sync'ed.
#['delayed_jobs',                   'standard_PK'],
['db_files',                        'standard_PK'],
#['prf_references',                  'standard_PK'],
#['property_group_types',            'standard_PK'],
#['event_tracking_configs_fibre_lines',      'create_PK', 'event_tracking_config_id', 'fibre_line_id'],
#['region_properties',               'standard_PK'],
#['fibre_line_properties',           'standard_PK'],
#['configurations_property_groups',  'create_PK', 'configuration_id', 'property_group_id'],
#['property_groups',                 'standard_PK'],
#['fibre_redundancies',              'standard_PK'],
['fibre_lines',                     'standard_PK'],
#['properties',                      'standard_PK'],
#['configurations',                  'standard_PK'],
['event_tags',                      'standard_PK'],
['helios_units',                    'standard_PK'],
['alert_configurations',            'standard_PK'],
['system_preferences',              'standard_PK'],
['health_components',               'standard_PK'],
#['documents_fibre_lines',           'create_PK', 'document_id', 'fibre_line_id'],
['helios_section_locations',        'standard_PK'],
['reference_points',                'standard_PK'],
['threat_configurations',           'standard_PK'],
['versions',                        'standard_PK'],
['threat_increments',               'standard_PK'],
['schedules',                       'standard_PK'],
['schedule_exceptions',             'standard_PK'],
['schedule_regions',                'standard_PK'],
['alert_responses',                 'standard_PK'],
['alerts',                          'standard_PK'],
['threat_thresholds',               'standard_PK'],
['calibrations',                    'standard_PK'],
# These 2 tables below should not be synced as it relates to the system health of each Helios.
#['controld_health_components',      'standard_PK'],
#['controld_health_properties',      'standard_PK'],
['documents',                       'standard_PK'],
['documents_reference_points',      'standard_PK'],
# This table is not present any more.
#['event_tracking_configs',          'standard_PK'],
['event_tracks',                    'standard_PK'],
#['fibre_line_properties_groups',    'standard_PK'],
['organization_preferences',        'standard_PK'],
['section_calibrations',            'standard_PK'] ,
['refresh',                         'standard_PK'],
['paths',                           'standard_PK'],
['path_segments',                   'standard_PK'],
['notification_email_lists',        'standard_PK'],
['locations',                       'standard_PK'],
['marker_types',                    'standard_PK'],
['markers',                         'standard_PK'],
['markers_marker_types',            'standard_PK']
]


namespace :bucardo do

  def exec_sql(conn, sql)
    p sql
    conn.execute sql
  end

  desc 'Setup postgres sequences with odd or even id, or default id with sequence_name=(odd|even|default)'
  task :update_sequences => :environment do
    sequence = ENV['sequence_name']

    if !(sequence == "odd" || sequence == "even" || sequence == "default")
      p "Invalid sequence_name. Please use either:"
      p " bin/rails bucardo:update_sequences sequence_name=odd"
      p "OR"
      p " bin/rails bucardo:update_sequences sequence_name=even"
      p "OR"
      p " bin/rails bucardo:update_sequences sequence_name=default"

    else
      p "UPDATING sequences of local postgres with #{sequence} sequence..."
      p " "

      @all_tables.each do |table|
        table_name = table[0]
        table_action = table[1]
        p "table #{table_name}  => action: #{table_action}"

        # action cases are: ignore, standard_PK, create_PK, existing_PK
        case table_action

          when "standard_PK"
			conn = ActiveRecord::Base.connection
			exec_sql(conn, "BEGIN TRANSACTION; LOCK TABLE #{table_name} IN EXCLUSIVE MODE;")
            result = exec_sql(conn, "select id from #{table_name} order by id desc limit 1;")
            last_id = (result.first.nil? ?  0 : result.first["id"].to_i)
            last_id = 0 if last_id < 0  # To cover cases  where id = -1 after installation (i.e with table configurations).

            p "last id = #{last_id}"

            if (sequence == "odd")
              start_value = (last_id.even? ? last_id + 1 : last_id + 2)
              increment_by = 2
              new_sequence = "#{table_name}_odd_id_seq"
            elsif (sequence == "even")
              start_value = (last_id.even? ? last_id + 2 : last_id + 1)
              increment_by = 2
              new_sequence = "#{table_name}_even_id_seq"
            else
              start_value = last_id + 1
              increment_by = 1
              new_sequence = "#{table_name}_id_seq"
            end

            seq_exists = exec_sql(conn, "select 0 as answer from pg_class where relkind='S' and relname='#{new_sequence}';")

			if (seq_exists.first.nil?)
			  exec_sql(conn, "CREATE SEQUENCE #{new_sequence} INCREMENT BY #{increment_by} START WITH #{start_value};")
			else
			  exec_sql(conn, "ALTER SEQUENCE #{new_sequence} RESTART WITH #{start_value};")
			end

			exec_sql(conn, "ALTER TABLE #{table_name} ALTER id SET DEFAULT nextval('#{new_sequence}'); COMMIT;")

          when "create_PK"
            p "Will multiple column Primary key for table #{table_name}"
            script = "ALTER TABLE #{table_name} ADD PRIMARY KEY (#{table[2]}, #{table[3]});"
            p "#{script}"

            begin
            ActiveRecord::Base.connection.execute "#{script}"
            rescue
               p "ERROR CREATING PRIMIRAY KEY. Table #{table_name} may already have Primary key "
            end

          when "existing_PK"
            p "Will use existing Primary key of table #{table_name}"

          else
            p "Ignore table #{table_name}"

        end

      end

    end

  end



  #todo need to confirm and reproduce the stalled problem before putting back this function

  #desc 'Undo the stalled syncs of  Bucardo - to run on the Bucardo server '
  #task :unstalled => :environment do
  #        p " This will: Stop Bucardo , unstall the syncs, and restart Bucardo "
  #        p "..."
  #        p ""
  #  #`service bucardo stop`
  #  #`sleep 5`
  #  #`bucardo deactivate all`
  #  #`bucardo validate all`
  #  #`bucardo activate all`
  #  #`bucardo kick all`
  #  #`service bucardo start`
  #        p"run the following to see the sync list:"
  #        p "  bucardo list sync"
  #
  #end
 end

namespace :setting do
  desc "Set the system Identity file "
  task :set_identity => :environment do
    system_identity_file = "/opt/Fotech/panoptes/etc/system_identity.yml"
    if !(File.exists?(system_identity_file))
      identity = ActiveRecord::Base.connection.select_all <<-sql
                SELECT * FROM system_preferences
                WHERE key in ('identity_name','identity_uuid')
      sql
      system_identity = {}
      system_identity["identity"] = {}
      identity.each do |identity_value|
        system_identity["identity"]["name"] = identity_value['value'] if "#{identity_value['key']}"=="identity_name"
        system_identity["identity"]["uuid"] = identity_value['value'] if "#{identity_value['key']}"=="identity_uuid"
      end

    else
      p "NOTICE: system_identity.yml already exists."
      p "Updating file if necessary."
      system_identity = YAML.load_file(system_identity_file)
      system_identity ||= {}
      system_identity["identity"] ||= {}
    end
    random_serial_number = rand(1000..9999).to_s
    system_identity["identity"]["name"] = 'random' + random_serial_number if system_identity["identity"]["name"].nil? || system_identity["identity"]["name"].empty?
    system_identity["identity"]["uuid"] = UUIDTools::UUID.timestamp_create.to_s if system_identity["identity"]["uuid"].nil? || system_identity["identity"]["uuid"].empty?
    system_identity["identity"]["serial_number"] = random_serial_number if system_identity["identity"]["serial_number"].nil? || system_identity["identity"]["serial_number"].empty?

    File.open(system_identity_file,'w')do |file|
      file.write system_identity.to_yaml
    end
    `chown apache:apache #{system_identity_file}`
  end
end


namespace :db do

  # This terminates connections from db clients.
  # Note: Our services are usually stopped before wiping/restoring, so this mostly affects other db clients.
  def terminate_connections()
    output = %x(psql -c "SELECT pid, pg_terminate_backend(pid) as terminated FROM pg_stat_activity WHERE pid <> pg_backend_pid();" -U fotech -d fotechdev_production)
    puts "output=#{output}"
    # We don't care if this fails.
  end

  task :save => :environment do
    output = %x(pg_dump -U fotech --verbose --no-owner --no-acl --create --clean fotechdev_production -f "/opt/Fotech/panoptes/etc/web/fotechdev.pg_dump" --exclude-table-data=delayed_jobs --exclude-table=tz_world 2>&1)
    success = $?.success?
    puts "output=#{output}"
    throw "fotech:db:save failed." if not success
  end

  task :save_config_only => :environment do
    output = %x(pg_dump -U fotech --verbose --no-owner --no-acl --create --clean fotechdev_production -f "/opt/Fotech/panoptes/etc/web/fotechdev.pg_dump" --exclude-table-data=alert_details --exclude-table-data=alert_responses --exclude-table-data=alerts --exclude-table-data=event_tags --exclude-table-data=event_tracks --exclude-table-data=events --exclude-table-data=delayed_jobs --exclude-table=tz_world 2>&1)
    success = $?.success?
    puts "output=#{output}"
    throw "fotech:db:save_config_only failed." if not success
  end

  task :restore, [:filename] => :environment do |task, args|
    filename = args.filename
    filename = "fotechdev.pg_dump" if filename.nil?
    terminate_connections
    output = %x(psql -U fotech --dbname postgres -f /opt/Fotech/panoptes/etc/web/#{filename} 2>&1)
    success = $?.success?
    puts "output=#{output}"
    throw "fotech:db:restore failed." if not success
    Rake::Task["db:migrate"].invoke
    Rake::Task["fotech:db:setup_timezone_tables"].invoke
  end

  task :wipe => :environment do
    terminate_connections
    Rake::Task["db:drop"].invoke
    Rake::Task["db:create"].invoke
    Rake::Task["db:migrate"].invoke
    Rake::Task["fotech:db:setup_timezone_tables"].invoke
  end

  task :setup_timezone_tables => :environment do
    output = %x(cd db && ./_setup-timezone-tables.sh production 2>&1)
    success = $?.success?
    puts "output=#{output}"
    throw "fotech:db:setup_timezone_tables failed." if not success
  end

end

end


