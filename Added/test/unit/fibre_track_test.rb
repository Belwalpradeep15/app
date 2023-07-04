require 'test_helper'

class FibreTrackTest < ActiveSupport::TestCase
  context "A fibre track" do
    setup do
      @fibre_line = FibreLine.with_geometry.find(fibre_lines(:calibrated_farnham).id)
      @fibre_track = @fibre_line.fibre_track
    end
    
    should "have known track length" do
      assert_equal 877.7799216, @fibre_track.track_length.precision(7)
    end

    should "calibrate to nil before the first calibration" do
        assert_nil @fibre_track.to_track_distance(5)
    end

    should "calculate input distances correctly exactly on first calibration" do
      assert_equal 140.00426282, @fibre_track.to_track_distance(257.3).precision(8)
    end 

    should "calculate input distances correctly exactly on second calibration" do
      assert_equal 347.20889384, @fibre_track.to_track_distance(465).precision(8)
    end 

    should "calculate input distances correctly after the first calibration" do
      assert_equal 140.70259330, @fibre_track.to_track_distance(258.0).precision(8) 
    end

    should "calculate input distance correctly before second calibration" do
      assert_equal 182.60242240, @fibre_track.to_track_distance(300.0).precision(8)
    end

    should "calculate input distances correctly after the second calibration" do
      assert_equal 348.23243938, @fibre_track.to_track_distance(466.0).precision(8) 
    end

    should "convert track distance to fibre distance correctly" do
      assert_equal 30, @fibre_track.to_fibre_distance(0)
      assert_equal 257.29, @fibre_track.to_fibre_distance(140.00).precision(2)
      assert_equal 464.99, @fibre_track.to_fibre_distance(347.20).precision(2)
      assert_equal 751.99, @fibre_track.to_fibre_distance(640.96).precision(2)
      assert_equal 407.65, @fibre_track.to_fibre_distance(290.0).precision(2)
      assert_equal 427.7, @fibre_track.to_fibre_distance(310.0).precision(2)
    end

    should "convert track distance to fibre distance and back again" do
      assert_equal 0, @fibre_track.to_track_distance(30)
      assert_equal 30, @fibre_track.to_fibre_distance(0)

      assert_equal 348.2, @fibre_track.to_track_distance(466.0).precision(1) 
      assert_equal 465.9, @fibre_track.to_fibre_distance(348.2).precision(1) 
    end

    should "throw an exception for geometry before the first calibration" do
      event = Event.new(:position => 29) # The first calibration point is 30
      assert_raise RuntimeError do
        @fibre_track.populate_geometry(event)
      end
    end
    
    context "and having polygon coords spanning One segement" do
      setup do
        line_geometry = "((51.25756417596892, -0.9209418296813965),(51.25681887978413, -0.9209311008453369),(51.25671144870712, -0.920255184173584),(51.25746346097434, -0.9195363521575928), (51.25756417596892, -0.9209418296813965))"
        @line_geoms = @fibre_line.intersect_geometries(line_geometry)
      end
      
      should "have a known Line intersecting geometry" do
        assert_instance_of GeoRuby::SimpleFeatures::LineString, @line_geoms
        assert_equal 2, @line_geoms.points.size
      end
      
      should "have know distances for each intersecting line" do
          end_distances = @fibre_track.end_distances_for_geometry(@line_geoms)[0]
          assert_equal 282.14419, end_distances[0].precision(5)
          assert_equal 376.97, end_distances[1].precision(5)
      end
    end

    context "and having polygon coords that span multiple segments" do
      setup do
        multiline_geometry = "((51.25624143479342, -0.9210598468780518),(51.255623694913325, -0.9210062026977539),(51.255650553341574, -0.9208559989929199),(51.255845276477146, -0.9207165241241455),(51.255623694913325, -0.9206092357635498),(51.256107144221176, -0.9204483032226562),(51.25624143479342, -0.9210598468780518),(51.25624143479342, -0.9210598468780518))"
        @multiline_geoms = @fibre_line.intersect_geometries(multiline_geometry)
      end

      should "have a known MultiLine intersecting geometry" do
        assert_instance_of GeoRuby::SimpleFeatures::MultiLineString, @multiline_geoms
        assert_equal 3, @multiline_geoms.geometries.size
      end
      
      should "have know distances for each intersecting line" do
        end_distances = @fibre_track.end_distances_for_geometry(@multiline_geoms)
        expected_results = [[11.55733, 20.24056], [39.91589, 68.48882], [133.79706, 180.47368]]
        expected_results.each_with_index do |pair, i|
          pair.each_with_index do |coord,j|
            assert_equal expected_results[i][j], end_distances[i][j].precision(5)
          end
        end
      end
    end

    context "and having polygon coords that spand no segments" do
      setup do
        multiline_geometry = "((51.2574970326637, -0.9166073799133301),(51.2568658808014, -0.9165215492248535),(51.25673159205317, -0.9176051616668701),(51.25737617446721, -0.9177553653717041),(51.2574970326637, -0.9166073799133301))"
        @multiline_geoms = @fibre_line.intersect_geometries(multiline_geometry)
      end

      should "have no intersecting geometries" do
        assert_nil @multiline_geoms
      end
    end
  end
end
