require 'rexml/document'

module XmlResponseHelper
  protected
    def doc
      @temp_doc ||= REXML::Document.new @response.body
    end
    
    def attribute_value(element_s, attribute)
      element(element_s).attributes[attribute]
    end
    
    def element(element_s)
      doc.root.elements[element_s]
    end
end
