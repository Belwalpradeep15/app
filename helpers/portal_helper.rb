# $Author$
# $Date$
# $Rev$
# $URL$
#
# COPYRIGHT:
# This file is Copyright © 2012 Fotech Solutions Ltd. All rights reserved.
require 'json'

module PortalHelper

    def available_menus

        email_support_info = {:name => @panoptes_name,
                              :serial_number => @panoptes_serial_number,
                              :uuid => @panoptes_uuid,
                              :version => APP_CONFIG["monitor"]["version"]}.to_json.gsub('"',"'")

        {
            nil         => {},
            'languages' => [
                { :label => I18n.t('prefs.section.display.language.none'), :classname => "flag", :url => "javascript: updateLanguagePortal('none');", :checked => (current_language == 'none')},
                { :label => 'English', :classname => "flag gb", :url => "javascript: updateLanguagePortal('en');", :checked => (current_language == 'en') },
                { :label => 'Español', :classname => "flag es", :url => "javascript: updateLanguagePortal('es');", :checked => (current_language == 'es') },
                { :label => 'Italiano', :classname => "flag it", :url => "javascript: updateLanguagePortal('it');", :checked => (current_language == 'it') },
                { :label => 'Türk', :classname => "flag tr", :url => "javascript: updateLanguagePortal('tr');", :checked => (current_language == 'tr') }
            ],
            'aboutPanoptes'  => { :name => "aboutPanoptes", :label => I18n.t('main.about.title') + "...", :url => "javascript: showAboutBox()" },
            'reportProblem'  => { :name => "reportProblem", :label => I18n.t('common.help.report_problem') + "...", :url => "javascript: emailSupport(" + email_support_info + ")" },
            'downloadLogs'  => { :name => "downloadLogs", :label => I18n.t('main.menu.admin.download_logs'), :url => "/monitor/main/download_logs" },
            'preferences'    => { :label => I18n.t('admin.menu.fotech.preferences'), :url => "javascript: showPreferencesWindow()" },
            'print'          => { :label => I18n.t('admin.menu.fotech.print'), :url => "javascript: window.print()" },
            'showLegend'     => { :name => "showLegend", :label => I18n.t("main.menu.view.show_legend"), :url => "javascript: monitor.legend.show()"},
            'showRecent'     => { :name => "showRecent", :label => I18n.t("main.menu.view.show_recent_events"), :url => "javascript: showRecentEvents()" },
            'showAlertList'  => { :name => "showAlertList", :label => I18n.t("main.menu.view.show_alert_list"), :url => "javascript: toggleAlertList()", :checked => false },
            'showLatLng'     => { :name => "showLatLng", :label => I18n.t("main.menu.view.show_lat_lng"), :url => "javascript: toggleShowLatLng()", :checked => false },
            'showHeliosStatus'=>{ :name => "showHeliosStatus", :label => I18n.t("main.menu.view.show_helios_statuses"), :url => "javascript: monitor.helios.toggleHeliosStatusDialog()", :checked => false, :disabled => true },
            'closePopups'    => { :name => "closePopups", :label => I18n.t("main.menu.view.close_all_popups"), :url => "javascript: closePopups()", :disabled => true },
            'filter'         => { :label => I18n.t("main.menu.events.filter"), :url => "javascript: showFilterDialog()" },
            'search'         => { :label => I18n.t("main.menu.events.historical"), :url => "javascript: openSearchWindow()" },
            'clearEvents'    => { :name => "clearEvents", :label => I18n.t("main.menu.events.clear_events"), :url => "javascript: clearEvents()", :disabled => true },
            'clearFilter'    => { :name => "clearEventFilter", :label => I18n.t("main.menu.events.clear_event_filter"), :url => "javascript: stopEventFilter()", :disabled => true },
            'admin'          => { :name => "adminWindow", :label => I18n.t("main.menu.admin"), :url => "/admin", :newPage => true},
            'resolveFibreBreaks'  => { :name => "resolveAllFibreBreaks", :label => I18n.t("main.menu.admin.resolve_all_fibre_breaks"), :url => "javascript: admin.alerts.portal.resolveAllFibreBreakAlerts(#{@alerts_require_comment_text});", :permissions => {:on => :alerts, :to => :respond}},
            'resolveAllAlarms'  => { :name => "resolveAllAlarms", :label => I18n.t("main.menu.admin.resolve_all"), :url => "javascript: admin.alerts.portal.resolveAllAlerts(#{@alerts_require_comment_text});",:permissions => {:on => :alerts, :to => :respond}},
            'outstandingAlarmsPage' => {:name => "outstandingAlarmsPage", :label => I18n.t('main.menu.admin.alerts'), :url => "javascript: showAdminWindow('/portal/alerts')"}
        }
    end

    def available_dialogs

        {
            'aboutPanoptes' => {:partial => 'monitor/main/about_box', :locals => {:menu => 'aboutPanoptes'}},
            'showLegend' => {:partial => '/monitor/main/legend', :locals => {:menu => 'showLegend'}},
            'showHeliosStatus' => {:partial => 'monitor/helioscontrol/helios_status', :locals => {:menu => 'showHeliosStatus'}},
            'showRecent' => {:partial => 'monitor/events/events', :locals => {:menu => 'showRecent'}}
        }
    end

=begin
 This method expects this in the application config file
portal:
    layout:
        menu:
            location: sidebar
            items:
                -   title: __SWIRL__
                    submenu:
                        - aboutFotech
                        - aboutPanoptes
                        - reportProblem
                        -
                        - preferences
                        - print
                        -
                        - languages
                -   title: View
                    submenu:
                        - showLegend
                        - showRecentEvents
                        - showAlarmList
                        - showHeliosStatus
                        - adminPages
                        -
                        - closePopups
                -   title: Events
                    submenu:
                        - filter
                        - search
                        -
                        - clearEvents
                        - clearEventFilter
=end

    def portal_menu_helper
        menu_config = APP_CONFIG['portal']['layout']['menu']['items']
        full_menu = []
        menu_config.each do |config|
            submenu = []
            config['submenu'].each do |menu|
                add_menu_config(submenu, available_menus[menu]) if available_menus.has_key?(menu)
            end

            full_menu <<  { :label => (config['title'] == '__SWIRL__' ? "<em id='fotechmenu'>[Image]</em>" : I18n.t('main.menu.' + config['title'].downcase + '.title', :default => config['title'])),
                            :name => config['title'].underscore,
                            :submenu => submenu
                            }
        end
        MenuRenderer.menu_javascript(full_menu, 'portal_menu_bar')
    end

    def portal_dialog_partials
        menu_config = APP_CONFIG['portal']['layout']['menu']['items']
        dialog_partials = []
        menu_config.each do |config|
            dialog_partials << config['submenu'].collect{|x| available_dialogs[x]}
        end
        dialog_partials.flatten.compact.uniq
    end

  private

  # Return the current language.
    def current_language
        loc = params[:locale]
        if !loc
            loc = Preference.where(user_id: @user.id, key: "language").first.value rescue 'none'
        end
        return loc
    end

    # Add a menu configuration item to menu if it has suitable permissions.
    def add_menu_config(menu, menu_config)
        if not menu_config
            menu << {:label => "#{menu} (Not implemented)",:url => '#'}
        elsif menu_config.kind_of?(Array)
            menu_config.each { |mc| add_menu_config(menu, mc) }
        else
            abilities = menu_config.delete :abilities
            permissions = menu_config.delete :permissions
            return if abilities and not SYSTEM_CONFIG['abilities'][abilities]
            return if permissions and not can?(permissions[:to], permissions[:on])
            menu << menu_config
        end
    end
end
