# FILENAME:     wav_writer.rb
# AUTHOR:       Steven Klassen (Adapted from the one created by Aaron in /app/leak.)
# CREATED ON:   2009-02-10
# 
# LAST CHANGE:
# $Author$
#   $Date$
#    $Rev$
#    $URL$
#
# COPYRIGHT:
# This file is Copyright (c) 2009 by Fotech Solutions. All rights
# reserved.

# Class used to create WAV files. 
class WavWriter
  BIT_08 = '8bit'
  BIT_16 = '16bit'

  def initialize(raw_data_array, accuracy, sample_rate)
    @sample_rate = sample_rate
    @raw_data = raw_data_array
    max_number = find_max()
    @accuracy   = accuracy
    @scale, @shift, @bytesPerSample = transform_attributes(max_number, @accuracy)
  end

  def write(output = STDOUT)
    @raw_data.map! { |val| Integer(val * @scale) + @shift }

    writeASCII(output, "RIFF")                                 # Chunk ID
    write32(output, (@raw_data.length * @bytesPerSample) + 36) # Chunk data size
    writeASCII(output, "WAVE")                                 # RIFF type

    writeASCII(output, "fmt ")                                 # Chunk ID
    write32(output, 16)                                        # Chunk size
    write16(output, 1)                                         # Compression code
    write16(output, 1)                                         # Number of channels
    write32(output, @sample_rate)                              # Sample rate
    write32(output, @sample_rate * @bytesPerSample)            # Average bytes per second
    write16(output, @bytesPerSample)                           # Block align
    write16(output, @bytesPerSample * 8)                       # Significant bits per sample

    writeASCII(output, "data")                                 # Chunk ID
    write32(output, @raw_data.length * @bytesPerSample)        # Chunk data size

    case @accuracy
      when BIT_08
        @raw_data.each { |val| write8(output, val) }
      when BIT_16
        @raw_data.each { |val| write16(output, val) }
    end

    if ((@raw_data.length * @bytesPerSample) % 2 > 0)          # Padding
        output.putc(0x00)
    end
  end

  private
    def find_max
      max_number = 0
      @raw_data.each do |value|
        value = value.abs
        max_number = value if value > max_number
      end
      return max_number
    end

    def transform_attributes(max, accuracy)
      case accuracy
        when BIT_08
          [0xFF.to_f / (2.0 * max), 0xFF / 2, 1]
        when BIT_16
          [0xFFFF.to_f / (2.0 * max), 0, 2]
        else
          raise "Unsupported accuracy=#{accuracy}"
      end
    end
      
    def writeASCII(output, str)
        str.each_byte { |b| output.putc(b) }
    end

    def write32(output, val)
        output.putc(0x000000FF & val)
        output.putc((0x0000FF00 & val) >> 8)
        output.putc((0x00FF0000 & val) >> 16)
        output.putc((0xFF000000 & val) >> 24)
    end

    def write16(output, val)
        output.putc(0x00FF & val)
        output.putc((0xFF00 & val) >> 8)
    end

    def write8(output, val)
        output.putc(0x000000FF & val)
    end
end
