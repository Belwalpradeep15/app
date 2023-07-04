require 'test_helper'

class EventTest < ActiveSupport::TestCase
  GEOMETRY_DELTA = 0.00001

  should validate_numericality_of(:fibre_line_id)
  should validate_numericality_of(:event_type_id)
  should validate_numericality_of(:position)
  should_not allow_value(-1.0).for(:amplitude)
  should ensure_inclusion_of(:confidence).in_range(0.0..1.0)
  should belong_to(:fibre_line)
  should belong_to(:event_type)

  context "Instantiating an Event with XML" do
    context "when XML is valid" do
      setup do
        params = {:fibre_line_id => fibre_lines(:calibrated_farnham).id,
                  :application => "security",
                  :event_type_name => event_types(:animal).name }
        @event = Event.new_from_xml(xml(:submit_event, params))
      end

      should "not be nil" do
        assert_not_nil(@event)
      end

      should "have time set" do
        assert_not_nil @event.time
      end

      should "have a position on the line" do
        assert_equal 400, @event.position
      end

      should "have a amplitude" do
        assert_equal(0.125, @event.amplitude)
      end

      should "have an event id" do
        assert_equal(event_types(:animal).id, @event.event_type_id)
      end

      should "have a confidence" do
        assert_equal(0.12345678, @event.confidence)
      end

      should "have a fibre line" do
        assert_equal(fibre_lines(:calibrated_farnham).id, @event.fibre_line_id)
      end

      should "have an application" do
        assert_equal("security", @event.application)
      end

      should "have a longitude" do
        assert_in_delta -0.91967, @event.longitude, GEOMETRY_DELTA
      end

      should "have a latitude" do
        assert_in_delta 51.25766, @event.latitude, GEOMETRY_DELTA
      end
    end

    context "when XML is invalid" do
      setup do
        @params = {:fibre_line_id => fibre_lines(:calibrated_farnham).id,
                  :application => "security",
                  :event_type_name => event_types(:animal).name }
      end

      should "should throw exception when event is of wrong type" do
        @params[:event_type_name] = event_types(:leak).name
        assert_raise RuntimeError do
          Event.new_from_xml(xml(:submit_event, @params))
        end
      end

      should "should throw exception when fibre line is of wrong application type" do
        @params[:application] = "leak"
        assert_raise RuntimeError do
          Event.new_from_xml(xml(:submit_event, @params))
        end
      end
    end
  end

end
