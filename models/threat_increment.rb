class ThreatIncrement < ApplicationRecord
    has_paper_trail
    belongs_to :threat_configuration

    def self.new_with_name(level)
        threat_config_templates = YAML.load_file("config/threat_configuration_templates.yml")

        ret = self.new
        ret.name = level
        ret.sequence = [nil,'hold','low','medium','top'].find_index(level)  
        default_template = threat_config_templates['default_settings']
        if default_template
            level = default_template['threat_increment'][level] || {}
            ret.increment_value = level['increment_value'].to_i
            ret.threshold = level['threshold'].to_i
        else  #fallback
            ret.increment_value = [nil, 0, 7, 9, 12][ret.sequence]
            ret.threshold = [nil, 1, 2, 3, 4][ret.sequence]
        end

        return ret
    end
end
