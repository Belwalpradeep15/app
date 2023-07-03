class ScheduleRegion < ApplicationRecord
    has_paper_trail
    default_scope { select "schedule_regions.*, AsText(schedule_regions.geom) AS geom_as_text" }

    #bounds come in as "swlat swlng,nelat nelng" in deg_dec
    def update_bounds(bounds)
        sw, ne = bounds.split(',').collect{|x| x.strip}
        swlat, swlng = sw.split(' ').compact
        nelat, nelng = ne.split(' ').compact

        coords = [[swlng, swlat],[swlng, nelat],[nelng, nelat],[nelng, swlat],[swlng,swlat]].collect{|x| x.join(' ')}

        ActiveRecord::Base.connection.execute <<-sql
            UPDATE schedule_regions
            SET geom = ST_GeomFromText('POLYGON((#{coords.join(',')}))')
            WHERE id = #{id} 
        sql
    end 

    # returns the bounds as a string of format "swlat swlng,nelat nelng" in deg_dec
    def get_bounds_string
        return "" if geom_as_text.nil?
        coords = geom_as_text.scan(/-?\d*\.?\d* -?\d*\.?\d*/)
        swlng,swlat = coords[0].split(' ')
        nelng,nelat = coords[2].split(' ')
        
        "#{swlat} #{swlng},#{nelat} #{nelng}"
    end
end
