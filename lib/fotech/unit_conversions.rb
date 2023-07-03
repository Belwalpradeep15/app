# FILENAME:     unit_conversions.rb
# AUTHOR:       Steven Klassen
# CREATED ON:   2009-12-17
# 
# LAST CHANGE:
# $Author$
#   $Date$
#    $Rev$
#    $URL$
#
# COPYRIGHT:
# This file is Copyright © 2009 Fotech Solutions Ltd. All rights reserved.


# This module is used to perform unit conversions. Note that if you modify this
# class you should also modify the fotech.util.convert method in the math.js file
# to ensure that our conversions are consistent regardless of whether they occur 
# on the server or on the client.
module UnitConversions

    # Perform a unit conversion. If the to and from units are the same the original value will
    # be returned. Otherwise the conversion will be performed if possible. If the conversion is
    # not possible, due to not being supported, an exception will be thrown. Currently the
    # following unit conversions are supported:
    #   'm' to 'ft', 'km' or 'mi' and the reverses
    def self.convert(val, fromunits, tounits, decimals = nil)
        if fromunits != tounits
            if fromunits == 'C' and tounits == 'F'
                val = (9.0 / 5.0) * val + 32.0
            elsif fromunits == 'F' and tounits == 'C'
                val = (5.0 / 9.0) * (val - 32.0)
            else
                convs = @@CONVERSIONS[fromunits]
                conv = convs[tounits] if convs
                raise "Unsupported unit conversion from '#{fromunits}' to '#{tounits}'." \
                    if not conv
                val = val * conv    
            end
        end
        
        if not decimals
            return val
        else
            scale = 10**decimals.to_i
            return (val * scale).round.to_f / scale
        end
    end

    def self.convertLatLngForDisplay(lat,lng,fromunits,tounits,decimals=nil)
        if !lat or !lng
            return ""
        end
        newLat,newLng = self.convertLatLng(lat,lng,fromunits,tounits,decimals)
        if tounits == 'dms'
            latDir = lat.to_f > 0 ? 'N' : 'S'
            lngDir = lng.to_f > 0 ? 'E' : 'W'
            newLat.gsub!(/^-?0*/,'')  #strip off leading 0 for lat
            newLng.gsub!(/^-?/,'')  #strip off leading 0 for lat
            return "#{newLat}#{latDir},#{newLng}#{lngDir}"
        else
            return "#{newLat},#{newLng}"
        end
    end
    
    def self.convertLatLng(lat,lng, fromunits, tounits, decimals)
        if (!lat || !lng)
            return [lat,lng]
        end
        if(fromunits != tounits)
            if fromunits == 'dms'
                latitude = self.convertDMSToDecimal(lat,decimals)
                longitude = self.convertDMSToDecimal(lng,decimals)
                return [latitude,longitude]
            else
                latitude = self.convertDecimalToDMS(lat,decimals)
                longitude = self.convertDecimalToDMS(lng, decimals)
                return [latitude,longitude]
            end
        elsif decimals
            scale = 10**decimals.to_i
            lastlat = lat.to_s.split(/[^0-9.]/).last
            lastlng = lng.to_s.split(/[^0-9.]/).last
            return [lat.to_s.gsub(lastlat, "#{(lastlat.to_f * scale).round.to_f/scale}"),lng.to_s.gsub(lastlng, "#{(lastlng.to_f * scale).round.to_f/scale}")]
        end
    end
  
    def self.convertDMSToDecimal(value, decimals)
        valueStr = value.to_s
        #split string into each part (any nonnumber will act as a delimiter)
        dms = valueStr.split(/[^0-9.,]+/).select{|x| x != ''}.collect{|x| x.to_f}
        deg = dms[0] + dms[1]/60.0 + dms[2]/3600.0
        if decimals
            scale = 10**decimals.to_i
            deg = (deg*scale).round.to_f/scale
        end

        if valueStr[/^-|[WS]$/i]
            deg = -deg
        end
        return deg
    end

    def self.convertDecimalToDMS(value, decimals)
        value = value.to_f

        absValue = value.abs
        seconds = absValue*3600.0
        d = (seconds/3600).floor.to_s.rjust(3,'0')
        m = ((seconds/60.0).floor % 60).to_s.rjust(2,'0')
        s = seconds % 60.0
        if decimals
            scale = 10**decimals.to_i
            s = (s*scale).round.to_f/scale
        end
        s = s.to_s.rjust(2,'0')

        "#{value < 0 ? '-' : ''}#{d}&deg;#{m}'#{s}&quot;";

    end

  private
    @@METRES_TO_FEET = 3.2808399166666664
    @@METRES_TO_KILOMETRES = 0.001
    @@METRES_TO_MILES = 6.21371192e-4
    @@SECONDS_TO_HOUR = 3600
    
    @@CONVERSIONS = {
        'm' => { 'ft' => @@METRES_TO_FEET, 'km' => @@METRES_TO_KILOMETRES, 'mi' => @@METRES_TO_MILES },
        'ft' => { 'm' => 1.0/@@METRES_TO_FEET },
        'km' => { 'm' => 1.0/@@METRES_TO_KILOMETRES },
        'mi' => { 'm' => 1.0/@@METRES_TO_MILES },
        'm_s' => {'ft_s' => @@METRES_TO_FEET, 'km_h' => @@METRES_TO_KILOMETRES * @@SECONDS_TO_HOUR, 'mi_h' => @@METRES_TO_MILES * @@SECONDS_TO_HOUR },
        'ft_s' => {'m_s' => 1.0/@@METRES_TO_FEET},
        'km_h' => {'m_s' => 1.0/(@@METRES_TO_KILOMETRES * @@SECONDS_TO_HOUR)},
        'mi_h' => {'m_s' => 1.0/(@@METRES_TO_MILES * @@SECONDS_TO_HOUR)},
        'm_s2' => {'ft_s2' => @@METRES_TO_FEET, 'km_h2' => @@METRES_TO_KILOMETRES * @@SECONDS_TO_HOUR**2, 'mi_h2' => @@METRES_TO_MILES * @@SECONDS_TO_HOUR**2 },
        'ft_s2' => {'m_s2' => 1.0/@@METRES_TO_FEET},
        'km_h2' => {'m_s2' => 1.0/(@@METRES_TO_KILOMETRES * @@SECONDS_TO_HOUR**2)},
        'mi_h2' => {'m_s2' => 1.0/(@@METRES_TO_MILES * @@SECONDS_TO_HOUR**2)}
        }
        
end


