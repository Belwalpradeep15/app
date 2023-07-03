class OrganizationPreference < FotechActiveRecord
    belongs_to :organization

    # Read the preferences for an organization as hash from key to OrganizationPreference objects.
    def self.for_organization_as_hash(organizationId)
        prefs = OrganizationPreference.where("organization_id = #{organizationId} and key not in ('identity_custom_name','identity_custom_id')")
        prefshash = {}
        prefs.each { |p| prefshash[p.key] = p }

        if (File.exists?(SYSTEM_IDENTITY_FILE))
            prefshash['identity_custom_name']   = OrganizationPreference.new(:key => "identity_custom_name",    :value=> YamlSupport.get_yaml_value('identity_custom_name',"#{organizationId}"))
            prefshash['identity_custom_id']     = OrganizationPreference.new(:key => "identity_custom_id",      :value=> YamlSupport.get_yaml_value('identity_custom_id',"#{organizationId}"))
        end

        return prefshash
    end

    def self.create_or_update(organizationId, key, value)
        if YamlSupport.is_key_on_yaml_file?(key)
            YamlSupport.create_or_update_through_yaml(key, value, organizationId)
        else
            count = self.where({:organization_id => organizationId, :key => key}).update_all({:value => value})

            if count == 0
                # Nothing updated, create it.
                self.create(:organization_id => organizationId, :key => key, :value => value)
            end

            return nil
        end
    end

end
