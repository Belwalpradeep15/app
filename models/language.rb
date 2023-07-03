# This class describes the available internationalization and languages. Note that at
# present this is NOT a DB backed model.
class Language

    # Construct a Language
    def initialize(languageAbbreviation, languageName, languageFlag)
        @abbreviation = languageAbbreviation
        @name = languageName
        @flag = languageFlag
    end

    # Returns the language abbreviation (e.g. 'en', or 'es')
    def abbreviation
        @abbreviation
    end

    # Returns the name of the language, in that langugage. (e.g. 'English' or 'Español')
    def name
        @name
    end

    # Returns the short name used to define the flag (e.g. 'gb' or 'es').
    def flag
        @flag
    end



    # Returns true if internationalization is enabled on this platform and false otherwise.
    def self.enabled?
        if APP_CONFIG['monitor']['i18n_enabled']
            return true
        else
            return false
        end
    end

    # Returns a list of all the available languages.
    def self.available_languages
        [ Language.new('en', 'English', 'gb'),
          Language.new('es', 'Español', 'es'),
          Language.new('it', 'Italiano', 'it'),
          Language.new('tr', 'Türk', 'tr') ]
    end
end
