# FILENAME:     custom_preference.rb
# AUTHOR:       Karina Simard
# CREATED ON:   10-09-23
# 
# DESCRIPTION:  
#
# LAST CHANGE:
# $Author$
#   $Date$
#    $Rev$
#    $URL$
#
# COPYRIGHT:
# This file is Copyright © 2010 Fotech Solutions Ltd. All rights reserved.

# Wrapper class for the CUSTOM_PREFERENCES hash that is created in 
# environment.rb

class CustomPreference
    def self.get_all
        return CUSTOM_PREFERENCES
    end
    
    def self.get_common
        return CUSTOM_PREFERENCES[nil] || {}
    end
    
    def self.get_by_organization(org_id)
        return get_common.merge(CUSTOM_PREFERENCES[org_id] || {})
    end
    
    # select the ids of all organizations have the specified preference defined
    # if value is not null then it will only return organizations that
    # have the preference defined AND where the value matches the preferences
    def self.get_organizations_by_pref(key, value = nil)
        org_list = []
        all_org_ids = Organization.all.collect{|o| o.id}
        all_org_ids.each do |org_id|
            preferences = get_by_organization(org_id)
            if preferences.keys.include? key
                if value.nil? or preferences[key] == value
                    org_list << org_id
                end
            end
        end
        return org_list
    end
end

