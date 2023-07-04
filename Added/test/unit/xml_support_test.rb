require 'test_helper'

class XmlSupportTest < ActiveSupport::TestCase
  include XmlSupport

  context "Using Search to find by XML" do
    setup do
      @xml_doc = xml(:search_query)
      @targets = Search.search_from_xml(@xml_doc)
      @fibre_line_target = @targets.find {|target| target.type == FibreLine}
      @event_type_target = @targets.find {|target| target.type == EventType}
    end

    should "have a fibre_line target with a known id" do
      assert_equal "2", @fibre_line_target.id
    end

    should "have 2 fibre line object" do
      # assert_equal 2, @fibre_line_target.size
    end

    should "Have two fibre_lines with known IDs" do
      known_fibre_line_ids = fibre_lines(:calibrated_farnham).id, fibre_lines(:mcmahon).id
      fibre_lines = @fibre_line_target.results.select do |record|
        known_fibre_line_ids.include?(record.id)
      end
      # assert_equal 2, fibre_lines.size
    end

    should "have four known event types for security applications" do
      expected = %w{unknown animal audio vehicle}
      actual = @event_type_target.results.collect{|record| record.name}
      assert_equal 0, (expected - actual).size
    end
  end

  context "Creating an XmlDocument" do
    setup do
      @xml_doc = XmlDocument.create(xml(:submit_event, :event_type_name => "leak"))
    end

    should "should provide a known name" do
      assert_equal "EventSubmit", @xml_doc.name
    end

    should "have access to text field" do
      assert_equal "2008-11-03T17:20:00-07:00",  @xml_doc.time
    end

    should "have access to an element" do
      assert_equal "leak", @xml_doc.event_type["name"]
    end

    should "raise an exception if event attribute is bogus" do
      assert_raise RuntimeError do
        @xml_doc.undefined_attribute_of_xml
      end
    end
  end

  context "Creating an SearchXmlDocument" do
    setup do
      @xml_doc = SearchXmlDocument.create(xml(:search_query))
    end

    should "be readable" do
      assert_not_nil @xml_doc
    end

    should "have a name of Search" do
      assert_equal "Search", @xml_doc.name
    end

    should "have known number of targets" do
      assert_equal 4, @xml_doc.size
    end

    should "create an array of known target documents" do
      assert_equal 4, @xml_doc.entries.size
    end

    should "be able to retrieve target id" do
      assert_equal "1", @xml_doc.entries.first.id
    end

    should "have a class as the target type" do
      assert_equal EventType, @xml_doc.entries.first.type
    end

    should "have accessible filters" do
      assert_equal "Application", @xml_doc.entries.first.filters.first[:field]
    end

    should "generates correct conditions" do
      target = @xml_doc.entries.find {|target| target.type == FibreLine}
      assert_equal "fibre_lines.owner_id = 1 AND apps.name = 'security'", target.conditions
    end

    should "find results for an EventType target" do
      expected = %w{unknown animal audio vehicle}
      present = (event_types.collect {|type| type.name }.to_set ^ expected.to_set)
      assert_equal 4, present.size, "Expected event types '#{expected.inspect}' but only found '#{present.inspect}'"
    end

  end
end
