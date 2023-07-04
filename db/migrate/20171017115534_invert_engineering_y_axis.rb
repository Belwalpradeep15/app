class InvertEngineeringYAxis < ActiveRecord::Migration[5.2]
	def self.up
		invertAllEngineeringDiagrams
	end

	def self.down
		# To reverse an invert, we just invert again.
		invertAllEngineeringDiagrams
	end

  private

	class SectionCalibration < ActiveRecord::Base
	end

	def self.invertAllEngineeringDiagrams
		SectionCalibration.reset_column_information
		SectionCalibration.transaction do
			SectionCalibration.all.each do |sc|
				fibreLineId = sc.fibre_line_id
				execute <<-SQL
					UPDATE section_calibrations
					SET y_offsets = (
						 SELECT array_agg(1 - y_offsets[s]) AS new_y_offsets
						 FROM (SELECT generate_subscripts(y_offsets, 1) AS s, y_offsets FROM section_calibrations WHERE fibre_line_id = #{fibreLineId}) offsetTable
						 )
					WHERE fibre_line_id = #{fibreLineId};
				SQL
			end
		end
	end
end
