# $Author$
#   $Date$
#    $Rev$
#    $URL$
#
# COPYRIGHT:
# This file is Copyright (c) 2008 by Fotech Solutions. All rights
# reserved.

class App < ApplicationRecord
  has_and_belongs_to_many :event_categories

  def event_types
    event_categories.map {|category| category.event_types }.flatten
  end

  # Find the applications for a given fibre line.
  def self.find_by_fibre_line(fibreLineId)
    fibre = FibreLine.find(fibreLineId)
    app_array = App.all
    fibre.event_categories.each {|x| app_array &= x.apps}
    return app_array.first
  end

  # Write out as the xml required by the repository search engine.
  def to_xml(options = {})
    return super(options) if options[:orig_to_xml]

    options[:indent] ||= 2
    xml = options[:builder] ||= Builder::XmlMarkup.new(:indent => options[:indent])

    xml.Application("application-id" => id) do
        xml.Name(name)
        xml.Description(description)
    end
  end

end
