class ThreatConfiguration < ApplicationRecord
    has_paper_trail
    belongs_to :event_type
    before_create :prepopulate_configs
    has_many :threat_increments, dependent: :destroy
    has_many :threat_thresholds, dependent: :destroy

    def prepopulate_configs
        self.alert_name = EventType.find(event_type_id).name + "_alert"
        threat_config_templates = YAML.load_file("config/threat_configuration_templates.yml")
        default_settings = threat_config_templates['default_settings']
        if default_settings
            self.counting_width = default_settings['counting_width']
            self.decrement_value = default_settings['decrement_value']
        else
            self.counting_width = 50
            self.decrement_value = -1
        end

        ['hold','low','medium','top'].each do |level|
            self.threat_increments <<  ThreatIncrement.new_with_name(level)
        end
 
        ['green','amber','red'].each do |level|
            self.threat_thresholds << ThreatThreshold.new_with_name(level)
        end
    end

    def hold_increment
        self.get_increment_by_name 'hold'
    end
    def low_increment
        self.get_increment_by_name 'low'
    end
    def medium_increment
        self.get_increment_by_name 'medium'
    end
    def top_increment
        self.get_increment_by_name 'high'
    end

    def get_increment_by_name(name)
        if ['hold','low','medium','top'].include? name
            self.threat_increments.select{|x| x.name == name}.first || ThreatIncrement.new_with_name(name)
        end
    end

    def green_threshold
        self.get_threshold_by_name 'green'
    end
    def amber_threshold
        self.get_threshold_by_name 'amber'
    end
    def red_threshold
        self.get_threshold_by_name 'red'
    end

    def get_threshold_by_name(name)
        if ['green','amber','red'].include? name
            self.threat_thresholds.select{|x| x.name == name}.first || ThreatThreshold.new_with_name(name)
        end
    end
end
