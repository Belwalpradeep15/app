#  system_config.rb
#  panoptes
#
#  Created by Steven W. Klassen on 2013-05-14.
#  Copyright (c) 2013 Fotech Solutions (Canada) Ltd. All rights reserved.


# Read in the system configuration file.
begin
    RAILS_DEFAULT_LOGGER.debug "Loading the system configuratioan."
    SYSTEM_CONFIG = YAML.load_file("/opt/Fotech/panoptes/etc/system_configuration.yml.baseline")
    if File.exists? "/opt/Fotech/panoptes/etc/system_configuration.yml"
        overrides = YAML.load_file("/opt/Fotech/panoptes/etc/system_configuration.yml")
        if overrides != false
            merger = proc { |key,v1,v2| Hash === v1 && Hash === v2 ? v1.merge(v2, &merger) : v2 }
            SYSTEM_CONFIG.merge!(overrides, &merger)
        end
    end
rescue => ex
    RAILS_DEFAULT_LOGGER.error "Could not load the system configuration!"
    SYSTEM_CONFIG = {}
end
SYSTEM_CONFIG = {} if not SYSTEM_CONFIG

# Add in automatically computed items.
SYSTEM_CONFIG['controld'] = {} if not SYSTEM_CONFIG.has_key?('controld')
SYSTEM_CONFIG['controld']['version'] = `/opt/Fotech/panoptes/bin/controld -v`
SYSTEM_CONFIG['modbusd'] = {} if not SYSTEM_CONFIG.has_key?('modbusd')
SYSTEM_CONFIG['modbusd']['version'] = `/opt/Fotech/panoptes/bin/modbusd -v`
SYSTEM_CONFIG['licenses_file'] = "/opt/Fotech/panoptes/etc/licenses.json"

#add file location to determine if is-active-panoptes
IS_NOT_ACTIVE_PANOPTES_FILE="/opt/Fotech/panoptes/etc/is_not_active_panoptes"
