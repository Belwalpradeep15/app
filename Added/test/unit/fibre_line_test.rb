# LAST CHANGE:
# $Author$
#   $Date$
#    $Rev$
#    $URL$
#
# COPYRIGHT:
# This file is Copyright © 2009 Fotech Solutions Ltd. All rights reserved.


require 'test_helper'

class FibreLineTest < ActiveSupport::TestCase
  context "A fibre line" do
    setup do
      @fibre_line = FibreLine.with_geometry.find(fibre_lines(:calibrated_farnham).id)
    end
    
    context "intersecting with know coordinates" do
      setup do
        polygon = "((51.25624143479342, -0.9210598468780518),(51.255623694913325, -0.9210062026977539),(51.255650553341574, -0.9208559989929199),(51.255845276477146, -0.9207165241241455),(51.255623694913325, -0.9206092357635498),(51.256107144221176, -0.9204483032226562),(51.25624143479342, -0.9210598468780518))"
        @intersect_geoms = @fibre_line.intersect_geometries(polygon)
      end
      
      should "have 3 intersecting lines" do
        assert_equal 3, @intersect_geoms.geometries.size
      end
    end

    context "has end points that corresponds to coordinates" do
      setup do
        polygon = "((51.25624143479342, -0.9210598468780518),(51.255623694913325, -0.9210062026977539),(51.255650553341574, -0.9208559989929199),(51.255845276477146, -0.9207165241241455),(51.255623694913325, -0.9206092357635498),(51.256107144221176, -0.9204483032226562),(51.25624143479342, -0.9210598468780518))"
        @end_distances = @fibre_line.end_distances(polygon)
      end

      should "have know distances" do
        expected_results = [[11.55733, 20.24056], [39.91589, 68.48882], [133.79706, 180.47368]]
        expected_results.each_with_index do |pair, i|
          pair.each_with_index do |coord,j|
            assert_equal expected_results[i][j], @end_distances[i][j].precision(5)
          end
        end
      end
    end

    context "has end points that do not corrispond to coordinates" do
      setup do
        polygon = "((51.2574970326637, -0.9166073799133301),(51.2568658808014, -0.9165215492248535),(51.25673159205317, -0.9176051616668701),(51.25737617446721, -0.9177553653717041),(51.2574970326637, -0.9166073799133301))"
        @end_distances = @fibre_line.end_distances(polygon)
      end

      should "have zero distances" do
        assert_equal [], @end_distances
      end
    end
    
  end

  context "Deleting a fibreline" do
    context "with events" do
      setup do
        @fibreLineId = fibre_lines(:calibrated_farnham).id
        @user = User.find(users(:organization_admin).id)
      end

      should "update deleted_at column" do
        FibreLine.delete_with_dependancies(@fibreLineId, @user)
        assert FibreLine.exists?(@fibreLineId)
        fibreLine = FibreLine.find(@fibreLineId)
        assert_not_nil fibreLine.deleted_at
      end
    end

    context "with time series" do
      setup do
        @fibreLineId = fibre_lines(:leak).id
        @user = User.find(users(:fotech_basic_user).id)
      end

      should "update deleted_at column" do
        FibreLine.delete_with_dependancies(@fibreLineId, @user)
        assert FibreLine.exists?(@fibreLineId)
        fibreLine = FibreLine.find(@fibreLineId)
        assert_not_nil fibreLine.deleted_at
      end
    end

    context "with fibre shots" do
      setup do
        @fibreLineId = fibre_lines(:leak).id
        @user = User.find(users(:fotech_basic_user).id)
      end

      should "update deleted_at column" do
        FibreLine.delete_with_dependancies(@fibreLineId, @user)
        assert FibreLine.exists?(@fibreLineId)
        fibreLine = FibreLine.find(@fibreLineId)
        assert_not_nil fibreLine.deleted_at
      end
    end
  end

  context "Finding fibrelines" do
    context "that are restricted to certain users" do
      setup do
          id = fibre_lines(:calibrated_farnham).id
          @fibreLineGood = FibreLine.find_with_permission(id, 'basic_user')
          @fibreLineBad = FibreLine.find_with_permission(id, 'fotech_basic_user')
      end
      
      should "return a fibre line when the user is allowed to see it." do
          assert_not_nil @fibreLineGood
      end

      should "NOT return a fibre line when the user is allowed to see it." do
          assert_nil @fibreLineBad
      end
    end
  end
end
