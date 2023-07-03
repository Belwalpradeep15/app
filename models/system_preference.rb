# FILENAME:     system_preference.rb
# AUTHOR:       Karina Simard
# CREATED ON:   10-09-07
#
# DESCRIPTION:
#
# LAST CHANGE:
# $Author$    Fredy Konig
#   $Date$    04-08-2015
#    $Rev$
#    $URL$
#
# COPYRIGHT:
# This file is Copyright © 2010 Fotech Solutions Ltd. All rights reserved.


class SystemPreference < ApplicationRecord

    def self.create_or_update(key, value)
        if YamlSupport.is_key_on_yaml_file?(key)
            YamlSupport.create_or_update_through_yaml(key, value)
        else
            count = self.where(key: key).update_all({:value => value, :updated_at => Time.now.utc})
            if count == 0
                # Nothing updated, create it.
                self.create(:key => key, :value => value)
            end
        end
    end

    def self.get_value(key)
        return YamlSupport.get_yaml_value(key) if YamlSupport.is_key_on_yaml_file?(key)
        pref = self.where(key: key).first
        return nil if pref.nil?
        return pref.value
    end

    # Obtain the value of the given key, setting it to the given default if it is not already set.
    def self.get_value_with_default(key, defaultValue)
        pref = self.get_value(key)

        if pref.nil?
            self.create_or_update(key, defaultValue)
            pref = defaultValue
        end

        return pref
    end

    # Read the preferences as hash from key to SystemPreference objects.
    def self.find_all_as_hash()
        prefs = SystemPreference.where("key not in ('identity_name','identity_uuid','identity_serial_number')")

        prefshash = {}
        prefs.each { |p| prefshash[p.key] = p }

        if File.exists?(SYSTEM_IDENTITY_FILE)
            prefshash['identity_name']          = SystemPreference.new(:key => "identity_name",             :value => YamlSupport.get_yaml_value('identity_name'))
            prefshash['identity_uuid']          = SystemPreference.new(:key => "identity_uuid",             :value => YamlSupport.get_yaml_value('identity_uuid'))
            prefshash['identity_serial_number'] = SystemPreference.new(:key => "identity_serial_number",    :value => YamlSupport.get_yaml_value('identity_serial_number'))
        end

        return prefshash
    end

    def self.alerts_require_comment_text?
        self.get_value('alerts_require_comment_text') == 'true'
    end

end

