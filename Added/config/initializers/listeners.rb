# FILENAME:     listeners.rb
# AUTHOR:       Steven Klassen
# CREATED ON:   2011-01-28
# 
# DESCRIPTION:  Install any listeners configured for the system.
#
# LAST CHANGE:
# $Author$
#   $Date$
#    $Rev$
#    $URL$
#
# COPYRIGHT:
# This file is Copyright © 2011 Fotech Solutions Ltd. All rights reserved.


require 'set'
require 'rexml/document'

# Read in the xml key/value parameters and return them.
def read_xml_parameters(root, xpath)
    params = {}
    REXML::XPath.each(root, xpath) { |param| 
        params[param.attributes['key']] = param.text 
        RAILS_DEFAULT_LOGGER.debug "    parameter #{param.attributes['key']}=#{param.text}"
    }
    return params
end
    
# Perform any requires lines.
def perform_requires(root, xpath)
    REXML::XPath.each(root, xpath) { |req|
        code = "require '#{req.text}'"
        RAILS_DEFAULT_LOGGER.debug "    #{code}"
        eval(code)
    }
end
    

# If the watchdog has been configured, add in alert types for any of the components
# found in the initial-health section.
begin
    RAILS_DEFAULT_LOGGER.info "reading watchdog components"
    handlers = Set.new()
    watchdog_types = []

    is = File.open("/opt/Fotech/panoptes/etc/watchdog-config.xml")
    doc = REXML::Document.new(is)
    REXML::XPath.each(doc, "//initial-health/entry/@component") do |component|
        component = "#{component}"      # extracts the value from the node
        RAILS_DEFAULT_LOGGER.info "considering alert type: #{component}"
        next if component == "panoptes" or component == "helios"
        next if handlers.include?(component)
        RAILS_DEFAULT_LOGGER.info "Adding new alert type: #{component}"
        handlers.add(component)
    end

    watchdog_types = Array(handlers)

rescue Errno::ENOENT => ex
    RAILS_DEFAULT_LOGGER.info "No watchdog alert components have been defined."
rescue Exception => ex
    RAILS_DEFAULT_LOGGER.error "listeners.rb(1): #{ex.message}"
ensure
    is.close if is
    is = nil
end


# Init any custom alert handlers if they exist. If the file doesn't exist we rescue the error
# and simply note that no custom alert handlers exist.
begin
    RAILS_DEFAULT_LOGGER.debug "reading alert listeners"
    handlers = []
    custom_types = []
    
    is = File.open("/opt/Fotech/panoptes/etc/alert-listeners.xml")
    doc = REXML::Document.new(is)
    REXML::XPath.each(doc, "//additional_alert_types/alert_type") do |alert_el|
        RAILS_DEFAULT_LOGGER.info "Adding new alert type: #{alert_el.attributes['name']}"
        custom_types << alert_el.attributes['name']
    end
    REXML::XPath.each(doc, "//listener") { |listener|
        el = REXML::XPath.first(listener, "class")
        raise "Listener is missing required class." \
            if not el
            
        cls = el.text
        RAILS_DEFAULT_LOGGER.debug "  #{cls}:"
        params = read_xml_parameters(listener, "parameters/parameter")
        perform_requires(listener, "requires/require")
        handlers << eval("#{cls}.new(params)")
    }
rescue Errno::ENOENT => ex
    RAILS_DEFAULT_LOGGER.info "No custom alert listeners have been defined."
    handlers = []
rescue Exception => ex
    RAILS_DEFAULT_LOGGER.error "listeners.rb: #{ex.message}"
    handlers = []
ensure
    is.close if is
end

WATCHDOG_ALERT_TYPES = watchdog_types
CUSTOM_ALERT_TYPES = custom_types
ALERT_LISTENERS = handlers

undef perform_requires
undef read_xml_parameters

