# $Author$
# $Date$
# $Rev$
# $URL$
#
# COPYRIGHT:
# This file is Copyright © 2009 Fotech Solutions Ltd. All rights reserved.

class ApplicationController < ActionController::Base
    before_action :set_locale
    # Force the authentication filter to the front of the list.
    prepend_before_action :authenticate

    # Returns true if we are the active panoptes and false otherwise. Note that if we are not
    # part of a redundant system then we assume we are the active panoptes.
    def is_active_panoptes?
      !File.exists?(IS_NOT_ACTIVE_PANOPTES_FILE)
    end

    # Obtain the current user name.
    def current_user_name
        return APP_CONFIG['portal']['user'] unless @current_username || require_authentication?

        @current_username
    end

    # Obtain the current user, checking that it has not changed.
    def current_user
      user_name = current_user_name

      cu = session[:current_user]
      session[:current_user] = nil if (cu && cu[:loginname] != user_name)

      if session[:current_user].nil? && user_name
        session[:current_user] = User.not_deleted.find_by_loginname(user_name)
        raise "Invalid user name `#{user_name}`." if session[:current_user].nil?
      end

      session[:current_user]
    end

    helper_method :current_user

    def has_role?(role)
        return current_user.is_a?(role) if current_user
        return false
    end

    helper_method :has_role?

    def authenticate
        @current_username = nil

        # If we don't require authentication, then we must fall back to using the portal user.
        if !require_authentication?
            setup_api_auth_token APP_CONFIG['portal']['user']
            return
        end

        if session[:current_user] == '__logout'
            logger.debug "About to request_http_basic_authentication - In the process of logging out."
            session[:current_user] = nil
            request_http_basic_authentication
            return
        end

        session[:current_user] = nil
        authenticate_with_http_basic do |l, p|
            user = User.not_deleted.find_by_loginname(l)
            unless user && Authentication.verify_password(user, p)
                logger.debug "Unauthorized. Logging out."
                session[:current_user] = '__logout'
                render :plain => "401 Unauthorized", :status => :unauthorized and return
            end

            @current_username = user.loginname
            session[:current_user] = user

            setup_api_auth_token(@current_username)

            if user.is_a? :system_admin
                session[:current_user].organizations = Organization.not_deleted.order(:name)
            end

            return
        end

        session[:current_user] = nil
        logger.debug "About to request_http_basic_authentication."
        request_http_basic_authentication
    end


    # Get the preferences for the current user. This will return all their preferences,
    # even those that have not been set, by using the defaults in the XML file for those
    # that have not yet been set for the user.
    def get_preferences
        begin
            userprefs = get_preferences_as_hash
            is = File.open("config/preferences.xml")
            doc = REXML::Document.new(is)
            defs = []
            REXML::XPath.each(doc, '//section') { |sec|
                prefs = []
                sec.elements.each { |pref|
                    # Overall preference stuff.
                    prf = { :key => pref.attributes['key'],
                                :type => pref.attributes['type'],
                                :default => pref.attributes['default'],
                                :label => pref.attributes['label'] }

                    # If tye type is a list we read in the possible values.
                    if prf[:type] == 'list'
                        values = []
                        pref.elements.each { |val|
                            values << { :value => val.attributes['value'],
                                        :label => val.text() }
                        }
                        prf[:values] = values
                    elsif prf[:type] == 'dynamic_list'
                        values = []
                        pref.elements.each do |val|
                            if val.name == 'value'
                                values << { :value => val.attributes['value'],
                                            :label => "i18n: prefs.section.#{sec.attributes['id']}.#{prf[:key]}.#{val.attributes['value']}" }
                            elsif val.name == 'query'
                                val_text = val.text()
                                results = eval(val_text)
                                results.each do |r|
                                    values << { :value => r.preference_value,
                                                :label => r.preference_label }
                                end
                            end
                        end
                        prf[:values] = values
                    end

                    # Set the value either from the user's stored preferences or from the default.
                    if userprefs.has_key? prf[:key]
                        prf[:value] = userprefs[prf[:key]]
                    else
                        prf[:value] = prf[:default]
                    end

                    prefs << prf
                }
                defs << { :id => sec.attributes['id'], :label => sec.attributes['label'], :preferences => prefs }
            }
            return defs
        ensure
            is.close if is
        end
    end

    def available_locales
        I18n.available_locales.map{|item| item.to_s}
    end

    # Get a single preference for the current user. This will return a value, even if the preference
    # has not been set, by using the defaults in the XML file. Note that the returned object will have
    # :key and :value attributes.
    #
    # Note that calling this will result in a database hit and may alse result in reading the
    # preferences configuration file. So you should call it as little as you can. If you need
    # more than one preference for a user it will be more efficient to call get_preferences to get
    # them all than to call this method twice.
    def get_preference(key)
        begin
            # First see if the user has set it.
            pref = Preference.where(user_id: current_user.id, key: key).first
            if pref
                return { :key => pref.key, :value => pref.value }
            end

            # If not get the default from the preferences.xml file.
            is = File.open("config/preferences.xml")
            doc = REXML::Document.new(is)
            default_value = REXML::XPath.first(doc, "//preference[attribute::key = '#{key}']/attribute::default")
            if default_value
                return { :key => key, :value => default_value.value }
            end

            # If we get here the requested preference does not exist.
            raise "Unsupported preference '#{key}'."
        ensure
            is.close if is
        end
    end

    def log_exception(ex)
        logger.error 'Exception: (' + ex.class.name + '): ' + ex.to_s + "\n" + ex.backtrace.join("\n")
    end

  # This method will be called when an uncaught exception occurs in a public method.
  def rescue_action_in_public(exception)
    @reference_code = (0...7).map{65.+(rand(25)).chr}.join
    logger.error "Error reference code: #{@reference_code}"

    if request.xml_http_request?
      render :update do |page|
        page.replace_html 'error_message', :partial => "errors/five_hundred", :locals => {:dismiss_button => true}
        page.show 'error_message'
      end
    else
      render :template => "errors/500", :layout => "admin", :locals => {:reference_code => @reference_code}
    end
  end

    # Escape any XML reserved characters. This is intended for cases where we cannot control
    # the input characters (i.e. user input) and where we are not using the more standard XML
    # builders. Note that this changes the input string as well as returns it. If you do not
    # want the original string to be changed you can call it using
    #   str2 = escape_xml(str.dup)
    #
    # This algorithm is based on one found at http://www.ruby-forum.com/topic/120436 . There is no
    # copyright that I can find.
    def escape_xml(str)
        str.gsub!(/[&<>'"]/) do | match |      # ' get around xcode parsing problem
            case match
            when '&' then '&amp;'
            when '<' then '&lt;'
            when '>' then '&gt;'
            when "'" then '&apos;'
            when '"' then '&quote;'
            end
        end
        return str
    end

    # Construct the admin submenu. This is used by both the monitor and admin sub-applications.
    def admin_submenu
        submenu = []
        if can? :manage, :webserver
            submenu << { :label => I18n.t('main.menu.admin.performance'), :url => "javascript: showAdminWindow('/admin/performance')" }
            submenu << {}
        end

        submenu << { :label => I18n.t('main.menu.admin.identity'), :url => "javascript: showAdminWindow('/admin/identity')" } if can?(:manage, :system) or can?(:manage, :organizations) or can?(:manage, :company)
        submenu << { :label => I18n.t('admin.orgs.header') + "...", :url => "javascript: showAdminWindow('/admin/organizations')" } if can?(:manage, :organizations)
        submenu << { :label => I18n.t('main.menu.admin.users'), :url => "javascript: showAdminWindow('/admin/users')" } if can?(:manage, :users)
        submenu << { :label => I18n.t('main.menu.admin.helios_units'), :url => "javascript: showAdminWindow('/admin/helios_units')" } if can?(:manage, :helios_units)
        submenu << { :label => I18n.t('main.menu.admin.panoptes_units'), :url => "javascript: showAdminWindow('/admin/panoptes_units')" } if can?(:manage, :helios_units)
        submenu << { :label => I18n.t('main.menu.admin.fibre_lines'), :url => "javascript: showAdminWindow('/admin/fibre_lines')" } if can?(:manage, :fibre_lines)
        submenu << { :label => I18n.t('main.menu.admin.paths'), :url => "javascript: showAdminWindow('/admin/paths')" } if can?(:manage, :paths)
        submenu << { :label => I18n.t('admin.markers.title') + "...", :url => "javascript: showAdminWindow('/admin/markers')" } if can?(:manage, :markers)
        submenu << { :label => I18n.t('main.menu.admin.event_clearing'), :url => "javascript: showAdminWindow('/admin/event_clearing_configs')" } if can?(:manage, :event_clearing)
        submenu << { :label => I18n.t('main.menu.admin.event_types'), :url => "javascript: showAdminWindow('/admin/event_types')" } if can?(:manage, :event_types)
        submenu << { :label => I18n.t('main.menu.admin.alert_configs'), :url => "javascript: showAdminWindow('/admin/alert_configurations')" } if can? :manage, :alert_configurations
        submenu << { :label => I18n.t('main.menu.admin.schedules'), :url => "javascript: showAdminWindowForAlarmSchedule('/admin/schedule')" } if can? :manage, :schedules
        submenu << { :label => I18n.t('admin.notifications.title') + "...", :url => "javascript: showAdminWindow('/admin/notifications')" } if can?(:manage, :notifications)
        submenu << { :label => I18n.t('main.menu.admin.system_check'), :url => "javascript: showAdminWindow('/admin/system_check')"} if APP_CONFIG['monitor']['system_check_enabled'] and can?(:trigger, :system_check)

        submenu << {}
        submenu << { :label => I18n.t('main.menu.admin.alerts'), :url => "javascript: showAdminWindow('/admin/alerts')" } if can?(:read, :alerts)
        submenu << { :label => I18n.t('main.menu.admin.purge_database'), :url => "javascript: showAdminWindow('/admin/purge_database')"} if can?(:trigger, :purge)

        submenu << {}
        if can? :restart, :panoptes_unit
            submenu << { :name => 'restart_services', :label => I18n.t('main.menu.admin.restart_services'), :url => "javascript: restartServices()"}
            submenu << { :name => 'restart_system', :label => I18n.t('main.menu.admin.restart_system'), :url => "javascript: restartSystem()"}
        end

        submenu << { :name => "downloadLogs", :label => I18n.t('main.menu.admin.download_logs'), :url => "/monitor/main/download_logs" }


        return submenu
    end

    # Report on a possible security breach.
    def security_breach
        logger.error "POSSIBLE SECURITY BREACH!!!"
        log_headers
        raise "POSSIBLE SECURITY BREACH: The user does not have permission to use this controller."
    end

    # Determine the scale for a set of amplitudes.
    def find_scale(amplitudes)
        max = 0.0
        amplitudes.each { |amp|
            val = amp.abs
            max = val if val > max
        }
        return max * 1000.0
    end

    # Compute the alert search conditions for the current user.
    # options include:
    #   :includeResolved, true to include resolved
    #   :includeAcknowledged, true to include acknowledged
    def compute_alert_conditions(options = {})
        options[:includeAcknowledged] = true if options[:includeAcknowledged].nil?

        conditions = []

        conditions << "(alerts.time_resolved IS NULL)" if not options[:includeResolved]
        conditions << "(alerts.time_acknowledged IS NULL)" if not options[:includeAcknowledged]
        conditions << "(alerts.organization_id IS NULL OR alerts.organization_id IN (#{current_user.organization_ids.join(',')}))" if not has_role? :system_admin
        conditions << "(alerts.is_suppressed = 'f')" if not options[:includeSuppressed]

        conditions << "1 = 1" if conditions.length == 0

        return conditions.join(" AND ")
    end

    private

    # Read the preferences for the current user as a hash.
    def get_preferences_as_hash
        prefs = Preference.where(user_id: current_user.id)
        prefshash = {}
        prefs.each { |pref| prefshash[pref.key] = pref.value }
        return prefshash
    end

    #get the preferences as hash with the defaults all filled in
    def get_preferences_as_hash_with_defaults
        prefshash = {}
        prefs = get_preferences.each do |hash|
            hash[:preferences].each do |prf|
                prefshash[prf[:key]] = prf[:value]
            end
        end

        return prefshash
    end

    # Write all the request headers to the log.
    def log_headers
        str = ""
        request.headers.each { |key, value| str << "     #{key}: #{value}\n" }
        logger.error str
    end

    def set_locale(force = false)
        if params.has_key?(:locale)
            if available_locales.include?(params[:locale])
                session[:current_user_locale] = params[:locale]
                logger.info "language chosen from locale param"
            else
                session[:current_user_locale] = nil
            end
            Preference.create_or_update('language', session[:current_user_locale] || 'none', current_user) if current_user_name
        end

        #only check if current_user_locale session var is blank
        if force or session[:current_user_locale].blank? or session[:current_user_local].nil?
            if current_user_name
                user_pref = Preference.find_by user_id: current_user.id, key: 'language'
                logger.info "language chosen from preference"
            else
                user_pref = nil
            end

            if user_pref && !user_pref.value.blank? && available_locales.include?(user_pref.value)
                session[:current_user_locale] = user_pref.value
            else
                #grabs from header, if not an available locale then default to en
                session[:current_user_locale] = get_locale_from_request_header
                session[:current_user_locale] = 'en' if !available_locales.include?(session[:current_user_locale])
                logger.info "language chosen from request header"
            end
        else
            logger.info "language chosen from session"
        end

        logger.info "the locale is set to: " + session[:current_user_locale]

        I18n.locale = session[:current_user_locale]
        response.headers["Content-Language"] = I18n.locale
    end

    def get_locale_from_request_header
        locale = nil  #default

        #try to grab locale from accept-language header
        if locale.nil? and request.headers["HTTP_ACCEPT_LANGUAGE"]
            locale = request.headers["HTTP_ACCEPT_LANGUAGE"][/^[a-z]{2}/]
        end

        #try to grab locale from user-agent header
        if locale.nil? and request.headers["HTTP_USER_AGENT"]
            locale = request.headers["HTTP_USER_AGENT"][/\b([a-z]{2})-[a-z]{2}\b/i,1]
        end
        return locale
    end

    def tz_offset_from_param
        min = params[:tz_offset].nil? ? 0 : -params[:tz_offset].to_i
        Time.zone = ActiveSupport::TimeZone[min]
        min
    end

    # Do we require authentication?.
    # Some child controllers support :portal_request routes {@see routes.rb}. These requests may not need authentication.
    def require_authentication?
        !(params[:portal_request] && !APP_CONFIG['portal']['authenticated'])
    end

    # Setup the REST API Authentication token
    def setup_api_auth_token(username)
        cmd = "sudo /opt/Fotech/panoptes/web/current_rest_api/tools/get_token_panoptes.sh #{username} 2>&1"
        logger.debug "#{cmd}"
        @api_auth_token = `#{cmd}`
        logger.info "Playing with token ... '#{@api_auth_token}' user:' #{username} #{$?}"
        raise "get_token_panoptes.sh failed" if !$?.success?
    end

end



