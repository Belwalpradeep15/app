# $Author$
# $Date$
# $Rev$
# $URL$
#
# COPYRIGHT:
# This file is Copyright (c) 2009 Fotech Solutions Ltd. All rights reserved.

# require 'parsedate'
require 'net/ping'
require 'resolv-replace'
require 'yaml'
require 'json'

IS_PASSENGER_ENABLE = defined?(PhusionPassenger) != nil
IS_NON_ROOT = %x(whoami) != "root\n"

class Monitor::MainController < MonitorController
    skip_before_action :authenticate, except: [:index]

    include ActionView::Helpers::JavaScriptHelper

    # Main entry point to the program.
    def index
        @user = current_user
        set_locale(true)
        @preferences = get_preferences
        init_application_state
        @mapProvider = APP_CONFIG["monitor"]["map_provider"]
        @heartbeatFrequency = SYSTEM_CONFIG['controld']['heartbeat_frequency_s']
        @distance_units = get_preference('units-distance')[:value]
        @velocity_units = get_preference('units-velocity')[:value]
        @acceleration_units = get_preference('units-acceleration')[:value]

        @panoptes_name = SystemPreference.get_value_with_default('identity_name', '').strip
        @panoptes_name = nil if @panoptes_name.length == 0

        @panoptes_uuid = SystemPreference.get_value_with_default('identity_uuid', '').strip
        @panoptes_uuid = nil if @panoptes_uuid.length == 0

        @panoptes_serial_number = SystemPreference.get_value_with_default('identity_serial_number', '').strip
        paths = Path.not_deleted.where(organization_id: current_user.organization_ids).select("name, label_towards, label_away").order("name")
        @required_path_hash = {}
        paths.each{|path|
             @required_path_hash[path.name] ||= []
             @required_path_hash[path.name] << path.label_towards
             @required_path_hash[path.name] << path.label_away
             @required_path_hash[path.name].uniq!
        }
        @panoptes_serial_number = nil if @panoptes_serial_number.length == 0

        # need panoptes info above
        construct_menu

        headers["Cache-Control"] = "no-cache"
    end

    # Items to be completed in the background at startup of the main screen.
    def startup
        @can_see_fotech_solutions = Net::Ping::HTTP.new(uri='www.fotechsolutions.com', timeout=5).ping
        @can_see_mail_server = Net::Ping::TCP.new(host='smtp.gmail.com', port='smtp', timeout=5).ping
    end

    # Create the filter dialog.
    def filter
        render :partial => "filter"
    end

    # Show a page regarding HTML5 canvas support.
    def canvas_support
        @have_google = Ping.pingecho('ajax.googleapis.com', 5, 'http')
        @forward_url = url_for(:controller => 'session', :action => 'logout')
    end

    # Create the legend dialog.
    def legend
        # Start with the common items.
        @status_entries = []
        @status_entries << {
            :name => 'alarm',
            :label => I18n.t('monitor.legend_dialog.alarm'),
            :icon => '/images/status/alarm.png' }
        @status_entries << {
            :name => 'warning',
            :label => I18n.t('monitor.legend_dialog.warning'),
            :icon => '/images/status/warning.png' }
        @status_entries << {
            :name => 'locked_out',
            :label => I18n.t('monitor.legend_dialog.locked_out'),
            :icon => '/images/status/locked_out.png' }
        @status_entries << {
            :name => 'health_ok',
            :label => I18n.t('monitor.legend_dialog.health_ok'),
            :icon => '/images/status/health_ok.png' }
        @status_entries << {
            :name => 'running',
            :label => I18n.t('monitor.legend_dialog.running'),
            :icon => '/images/status/running.png' }
        @status_entries << {
            :name => 'standby',
            :label => I18n.t('monitor.legend_dialog.standby'),
            :icon => '/images/status/standby.png' }

        @item_entries = []
        # Add in the alarms.
        Alert.alert_types.each do |t|
            @item_entries << {
                :name => t,
                :label => I18n.t("alert.type_names.#{t}"),
                :icon => Alert.small_icon_for(t) }
        end

        # Add in the events.
        if params[:eventTypes]
            types = EventType.where("name IN (?)", params[:eventTypes].split(','))
            types.each do |t|
                @item_entries << {
                    :name => t.name,
                    :label => t.description,
                    :icon => t.image_path('small')
                }
            end
        end

        @status_entries.sort! { |a,b| a[:label] <=> b[:label] }
        @item_entries.sort! { |a,b| a[:label] <=> b[:label] }

        @isInitiallyVisible = params[:visible]

        render :layout => false
    end

    # Display the system health.
    def system_health
        @health = HealthComponent.all.order(:id)
        @is_active_panoptes = are_we_the_active_panoptes(@health)
        @unresolvedAlarms = Alert.where(time_resolved: nil)
        render :json => {
            :health => @health,
            :active => @is_active_panoptes,
            :unresolvedAlarms => @unresolvedAlarms,
            :configuration => {
                :component_icon_directory => SYSTEM_HEALTH_CONFIG[:component_icon_directory],
                :status_icon_directory => SYSTEM_HEALTH_CONFIG[:status_icon_directory]
            }
        
        }
        # layout => false
    end

    def execute_shell_no_raise(command)
        `#{command}  2>&1`
    end

    def download_logs
        temp_dir = '/var/log/Fotech/tmp'
        `mkdir #{temp_dir}`

        # Postgresql daily log can be quiet big, so we limit to 100K.
        dow = Time.now.strftime('%a')
        postgresql_file = "/var/lib/pgsql/data/pg_log/postgresql-#{dow}.log"
        postgresql_temp_file = "/var/log/Fotech/postgresql-#{dow}.log"
        `sudo -n tail -c100K #{postgresql_file} > #{postgresql_temp_file}`

        # Bucardo log can be quite big so we limit it to 20000 lines.
        bucardo_file = '/var/log/bucardo/log.bucardo'
        bucardo_temp_file = '/var/log/Fotech/log.bucardo'
        `tail -n20000 #{bucardo_file} > #{bucardo_temp_file}`

        if IS_PASSENGER_ENABLE
            if IS_NON_ROOT
                execute_shell_no_raise "sudo cp -R /var/log/httpd /var/log/Fotech/"
                execute_shell_no_raise "sudo chown -R $(id -un):$(id -gn) /var/log/Fotech/httpd"
                execute_shell_no_raise "sudo cp /var/log/messages /var/log/Fotech/"
                execute_shell_no_raise "sudo chown $(id -un):$(id -gn) /var/log/Fotech/messages"
            else
                execute_shell_no_raise "cp -R /var/log/httpd /var/log/Fotech/"
                execute_shell_no_raise "cp /var/log/messages /var/log/Fotech/"
            end
        end

        filenames_regex = ["/var/log/Fotech/*.*",
                     "/var/log/Fotech/httpd/*"]

        filenames = ['/var/log/Fotech/messages',
                     '/var/log/Fotech/panoptes_access_log',
                     '/opt/Fotech/panoptes/etc/custom_application_config.yml',
                     '/opt/Fotech/panoptes/etc/watchdog-config.xml',
                     '/opt/Fotech/panoptes/etc/modbus_configuration.xml',
                     '/opt/Fotech/panoptes/etc/system_configuration.yml',
                     '/opt/Fotech/panoptes/etc/system_identity.yml']

        files_that_exist = []

        for file in filenames do
        	if File.file?(file) then
        		files_that_exist.push(file)
        	end
        end

        time_string = Time.now.strftime('%Y%m%d%H%M%S')
        tar_file_name = "panoptes_diagnostics_#{time_string}.tar.gz"
        tar_file_path = "/var/log/Fotech/tmp/#{tar_file_name}"

        `tar czf #{tar_file_path} #{(files_that_exist + filenames_regex).join(' ')}`

        content = File.read(tar_file_path)

        `rm #{tar_file_path}`
        `rm -r #{temp_dir}`
        `rm -rf /var/log/Fotech/httpd`
        `rm -f /var/log/Fotech/messages`

        temp_files = [postgresql_temp_file, bucardo_temp_file]
        temp_files.each{ |f|
            if File.exists?(f)
                `rm #{f}`
            end
        }

        send_data content, :filename => tar_file_name
    end
  private

    # Determine if we are the active panoptes. We assume that we are the active panoptes
    # unless there is another panoptes marked as running.
    def are_we_the_active_panoptes(health_components)
      !File.exists?(IS_NOT_ACTIVE_PANOPTES_FILE)
        #is_active = SystemPreference.get_value('is-active-panoptes')
        #return (is_active.nil? or is_active == 'true')
    end

    # Read the recent changes file.
    def read_recent_changes
        versions = []
        version = nil
        File.open("#{Rails.root}/config/recent_changes.txt", "r") do |file|
            while not file.eof?
                line = file.readline
                if line.start_with? '['
                    version = {}
                    pos = line.index("/")
                    version[:name] = line[1, pos-1]
                    version[:date] = Time.local(*(ParseDate.parsedate(line[pos+1, 10])))
                    version[:features] = []
                    version[:fixes] = []
                    versions << version
                elsif line.start_with? '-'
                    version[:features] << line.chomp!.sub("- ","").strip
                elsif line.match(/^\d/)
                    fix = {}
                    pos = line.index(/\s/)
                    fix[:number] = line[0, pos].to_i
                    fix[:description] = line[pos+1, line.length].chomp!.strip
                    insert_fix(version[:fixes], fix)
                end
            end
        end
        versions
    end

    # Insert a fix into the array, keeping them ordered by the fix number. We perform a
    # linear search, starting from the back of the array on the assumption that most of
    # the time we are given the values in order.
    def insert_fix(fixes, fix)
        len = fixes.length
        if len == 0
            fixes << fix
        else
            len.downto(1) { |i|
                if fix[:number] > fixes[i-1][:number]
                    fixes[i,0] = fix
                    return
                end
            }
            fixes[0,0] = fix
        end
    end

    # TODO: Reduce duplicate code used for partial => 'monitor/fibre_lines/fibre_lines':
    # Code in markers_controller, shcedule_controller, main_controller, and portal_controller
    # should be refactored and put into a common location. I have not done that now as an even
    # better solution would be to refactor the map display to be a "partial" that could
    # be included in all the pages where a map would be useful.
    # See issue #17978.
    # Perform the queries needed to startup the application.
    def init_application_state
        fibreLineIds = []
        if can? :read, :fibre_lines
            @global_fibre_lines = FibreLine.with_geometry.where(owner_id: current_user.organization_ids).order("upper(name)")
            @categoryIds = FibreLine.get_event_category_ids_for_fibre_lines(@global_fibre_lines)

            @global_fibre_lines.each { |fl| fibreLineIds << fl.id }

        else
            @global_fibre_lines = []
            @categoryIds = {}
        end

        @eventTypes = EventType.get_active
        @eventTypes = EventType.sort_by_description(@eventTypes)

        @events = Event.find(params[:event], :conditions => { :fibre_line_id => current_user.organization_ids }) if params[:event] && current_user.organization_ids

        @displayTypes = {}
        DisplayType.all.order("description").each { |dt| @displayTypes[dt.id] = dt.description }

        @activeRanges = {}
        @global_fibre_lines.each { |fl| @activeRanges[fl.id] = fl.compute_active_range() }

        @heliosUnitIds = Set.new
        @global_fibre_lines.each { |fl| @heliosUnitIds << fl.helios_unit_id if fl.helios_unit_id }
        @heliosUnitIds = @heliosUnitIds.to_a

        if can? :manage, :helios_units
            @heliosUnits = HeliosUnit.all.order("name")
            @heliosUnitIds = @heliosUnits.collect { |helios| helios.id }
        else
            @heliosUnits = HeliosUnit.all.where(id: @heliosUnitIds).order("name")
        end
        @helios_data = {}
        @heliosUnits.each do |helios|
            @helios_data[helios.id] = helios
        end
        @initial_display_type = get_preference('initial-overview')[:value]
    end


    # Construct a suitable menu for the current user.
    def construct_menu
        @menu = []
        language_pref = Preference.where(user_id: current_user.id, key: "language").first.value rescue 'none'
        email_support_info = {:name => @panoptes_name,
                              :serial_number => @panoptes_serial_number,
                              :uuid => @panoptes_uuid,
                              :version => APP_CONFIG["monitor"]["version"]}.to_json.gsub('"',"'")
        submenu = [
            { :label => I18n.t('main.about.title') + "...", :url => "javascript: showAboutBox()" },
            { :name => "reportProblem", :label => I18n.t('common.help.report_problem') + "...", :url => "javascript: emailSupport(" + email_support_info + ")" },
            { :label => I18n.t('main.menu.help.title'), :url => "/help" },
            {},
            { :label => I18n.t('admin.menu.fotech.preferences'), :url => "javascript: showPreferencesWindow()" },
            { :label => I18n.t('admin.menu.fotech.print'), :url => "javascript: window.print()" }
        ]
        if Language.enabled?
            submenu << {}
            submenu << { :label => I18n.t('prefs.section.display.language.none'), :classname => "flag", :url => "javascript: updateLanguage('none');", :checked => language_pref == 'none'}
            Language.available_languages.each { |lang|
                submenu << { :label => lang.name, :classname => "flag #{lang.flag}", :url => "javascript: updateLanguage('#{lang.abbreviation}');", :checked => language_pref == lang.abbreviation}
            }
        end

        # Logout does not work properly in the chrome browser so we don't allow it. Users must
        # exit the browser in order to logout.
        user_agent = request.env['HTTP_USER_AGENT']
        if not user_agent.include? 'chromeframe'
            submenu << {}
            submenu << { :label => I18n.t('main.menu.fotech.logout'), :url => "/monitor/session/logout" }
        end
        @menu << { :name => "fotechmenu", :submenu => submenu }

        submenu = []
        submenu << { :label => I18n.t('main.menu.fibres.view_all_overview'), :url => "javascript: setMainFibreView(null,'list')" }
        submenu << { :label => I18n.t('main.menu.fibres.view_all_map'), :url => "javascript: setMainFibreView(null, 'map')" }

        Document.where(organization_id: @user.organization_ids, is_overview: true).each do |d|
          submenu << { :label => I18n.t('main.menu.fibres.view_all_section', :sectionId => d.id), :url => "javascript: setMainFibreView([#{d.fibre_line_ids.join(',')}], 'section', #{d.id})" }
        end

        submenu << {}
        if can? :read, :fibre_lines
            fibreLineCount = @global_fibre_lines.length
            @global_fibre_lines.each { |line|
                if @activeRanges[line.id]
                    label = escape_javascript(line.name)
                    label << " (#{line.id})" if can?(:manage, :fibre_lines)
                    submenu << {
                        :name => "fibre-#{line.id}",
                        :label => label,
                        :url => "javascript: setMainFibreView(#{line.id})",
                        :checked => (fibreLineCount == 1 ? true : false),
                        :disabled => (fibreLineCount == 1 ? true : false)
                    }
                end
            }
            @menu << {
                :name => "fibresmenu",
                :label => I18n.t('main.menu.fibres.title'),
                :submenu => submenu
            }
        end

        submenu = []
        submenu << { :name => "showLegend", :label => I18n.t("main.menu.view.show_legend"), :checked => false, :disabled => true }
        submenu << { :name => "showRecent", :label => I18n.t("main.menu.view.show_recent_events"), :url => "javascript: toggleRecentEvents()", :checked => true }
        submenu << { :name => "showAlertList", :label => I18n.t("main.menu.view.show_alert_list"), :url => "javascript: toggleAlertList()", :checked => false }

        submenu << { :name => "showLatLng", :label => I18n.t("main.menu.view.show_lat_lng"), :url => "javascript: toggleShowLatLng()", :checked => false }
        submenu << { :name => "showHeliosStatus", :label => I18n.t("main.menu.view.show_helios_statuses"), :url => "javascript: monitor.helios.toggleHeliosStatusDialog()", :checked => false, :disabled => true }

        submenu << {}
        submenu << { :name => "closePopups", :label => I18n.t("main.menu.view.close_all_popups"), :url => "javascript: closePopups()", :disabled => true }
        @menu << {
              :name => "viewmenu",
              :label => I18n.t('main.menu.view.title'),
              :submenu => submenu
            }

        submenu = []
        if can? :read, :fibre_lines
            submenu << { :label => I18n.t("main.menu.events.filter"), :url => "javascript: showFilterDialog()" }
            submenu << { :label => I18n.t("main.menu.events.historical"), :url => "javascript: openSearchWindow()" }
            submenu << {}
            submenu << { :name => "clearEvents", :label => I18n.t("main.menu.events.clear_events"), :url => "javascript: clearEvents()", :disabled => true }
            submenu << { :name => "clearEventFilter", :label => I18n.t("main.menu.events.clear_event_filter"), :url => "javascript: stopEventFilter()", :disabled => true }
        end
        @menu << { :name => "eventsmenu", :label => I18n.t('common.headers.events'), :submenu => submenu } \
            if !submenu.empty?

        submenu = []
        if !submenu.empty?
          @menu << {
              :name => "toolsmenu",
              :label => I18n.t('main.menu.tools.title'),
              :submenu => submenu
          }
        end

        submenu = admin_submenu
        if !submenu.empty?
          @menu << {
              :name => "adminmenu",
              :label => I18n.t('main.menu.admin.title'),
              :submenu => submenu
          }
        end

    end
end
