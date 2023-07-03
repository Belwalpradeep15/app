class ThreatThreshold < ApplicationRecord
    has_paper_trail
    belongs_to :threat_configuration

    def self.new_with_name(level)
        threat_config_templates = YAML.load_file("config/threat_configuration_templates.yml")

        ret = self.new
        ret.name = level
        ret.sequence = [nil, 'green', 'amber', 'red'].find_index(level)
        default_template = threat_config_templates['default_settings']
        if default_template
            level = default_template['threat_threshold'][level] || {}
            ret.threshold = level['threshold'].to_i
            ret.clearance = level['clearance'].to_i
            ret.hysteresis = level['hysteresis'].to_i
        else
            ret.threshold = [nil, 1, 15, 25][ret.sequence]
            ret.clearance = [nil, 1, 12, -1][ret.sequence]
            ret.hysteresis = [nil, 0, 2, 0][ret.sequence]
        end

        return ret
    end
end
