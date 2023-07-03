# FILENAME:     admin_controller.rb
# AUTHOR:       Steven Klassen
# CREATED ON:   2009-11-04
# 
# DESCRIPTION:  Base class for all the admin controllers.
#
# LAST CHANGE:
# $Author$
#   $Date$
#    $Rev$
#    $URL$
#
# COPYRIGHT:
# This file is Copyright © 2009 Fotech Solutions Ltd. All rights reserved.


class AdminController < PublicController
    helper :all
    protect_from_forgery

    def set_unit_prefs
        @distance_units = get_preference('units-distance')[:value]
        @distance_precision = get_preference('precision-distance')[:value]
    end

    def build_fir_filename(prf, highcut)
        prf = prf.to_i if prf.to_i == prf #truncate if .0
        "#{highcut.to_i}_#{prf}KHz.bmf"
    end

    # Create a menu that will be common through all admin apps.
    def setup_admin_menu
        menu = []
        menu << { 
            :name => "fotechmenu",
            :submenu => [
                { :label => I18n.t('admin.menu.fotech.preferences'), :url => 'javascript: fotech.gui.rootOpener().showPreferencesWindow()' },
                { :label => I18n.t('admin.menu.fotech.print'), :url => 'javascript: window.print()' },
                {},
                { :label => I18n.t('admin.menu.fotech.refresh'), :url => 'javascript: fotech.gui.rootOpener().location.reload(true)' },
                { :label => I18n.t('common.menu.close_window'), :url => 'javascript: window.close()' }
            ]
        }
        
        submenu = admin_submenu
        menu << { :name => "adminmenu", :label => I18n.t('main.menu.admin.title'), :submenu => submenu }
        
      return menu
    end
    
    # Flush the current user from the cache. This must be done when something affecting the
    # cached portion of the user (like the company list) are changed.
    def flush_current_user
        session[:current_user] = nil
    end
    
    # Clear the fibre break for a fibre id and resolve any related alarms.
    def do_clear_fibre_break(fibreId)
        fibre = FibreLine.resolve_fibre_break(fibreId)
        if fibre.nil?
            raise "Failed to save the fibre break change."
        else
            Alert.unresolved_fibre_break_alerts(fibreId).each do |alert|
                alert.respond('resolve', alert.id , nil, current_user)
                AlertEngine.new(alert.id, logger).process_merged_alert
            end
        end
    end
    
    
    # Set a preference with a default if necessary.
    def set_pref_with_default(outputPrefs, inputPrefs, key, defaultValue)
        if inputPrefs.has_key? key
            outputPrefs[key] = inputPrefs[key].value
            else
            outputPrefs[key] = defaultValue
        end
    end
end

