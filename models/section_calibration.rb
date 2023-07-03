# FILENAME:     section_calibration.rb
# AUTHOR:       Steven Klassen
# CREATED ON:   2009-05-27
#
# LAST CHANGE:
# $Author$
#   $Date$
#    $Rev$
#    $URL$
#
# COPYRIGHT:
# This file is Copyright © 2009 Fotech Solutions Ltd. All rights reserved.


class SectionCalibration < FotechActiveRecord
    belongs_to :fibre_line
    belongs_to :document
    has_and_belongs_to_many :fibre_lines

    # as_double_precision_array :fibre_distances
    # as_double_precision_array :x_offsets
    # as_double_precision_array :y_offsets

    # Write out in our XML format.
    def to_xml(options = {})
        options[:indent] ||= 2
        xml = options[:builder] ||= Builder::XmlMarkup.new(:indent => options[:indent])

        xml.Calibration("type" => "section", "id" => id) do
            xml.FibreLineRef("fibre-line-id" => fibre_line_id)
            xml.DocumentRef("document-id" => document_id)
            xml.FibreDistances { FotechXML.write_as_float_1d(xml, fibre_distances) } if fibre_distances
            xml.XOffsets { FotechXML.write_as_float_1d(xml, x_offsets) } if x_offsets
            xml.YOffsets { FotechXML.write_as_float_1d(xml, y_offsets) } if y_offsets
        end
    end
end
