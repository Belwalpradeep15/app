require 'test_helper'
require 'xml_response_helper'

class Repository::SearchControllerTest < ActionController::TestCase
  include XmlResponseHelper

  should "Ensure only posts are allowed" do
    [:search].each do |page|
      get(page)
      assert_response 405

      delete(page)
      assert_response 405

      put(page)
      assert_response 405
    end
  end

  context "Submitting FibreLine search xml" do
    setup do
      @params = { :target_id => 1,
                           :type => "FibreLine",
                           :filter => { :field => "FibreLineId",
                                        :operation => "EQUALS",
                                        :value => fibre_lines(:calibrated_farnham).id
                                      }
                }
    end

    context "with no options" do
      setup do
        set_xml_header(xml(:search, @params))
        post(:search)
      end

      should respond_with(:success)
      should respond_with_content_type(:xml)
      should render_template("search")

      should "should contain routes" do
        assert_not_nil element("resp:Target/FibreLine/Route")
      end
      
      should "not contain a map calibration" do
        assert_nil element("resp:Target/FibreLine/Calibration[attribute::type='map']")
      end
    end

    context "with suppress routes" do
      setup do
        @params[:suppress_route] = "yes"
        set_xml_header(xml(:search, @params))
        post(:search)
      end

      should respond_with(:success)
      should respond_with_content_type(:xml)
      should render_template("search")

      should "should not contain routes" do
        assert_nil element("resp:Target/FibreLine/Route")
      end
    end
    
    context "with map calibration" do
        setup do
            @params[:add_map_calibration] = "yes"
            set_xml_header(xml(:search, @params))
            post(:search)
        end
        
        should respond_with(:success)
        should respond_with_content_type(:xml)
        should render_template("search")
        
        should "contain a map calibration with 8 elements" do
            el = element("resp:Target/FibreLine/Calibration[attribute::type='map']")
            assert_not_nil el
            assert_equal el.elements.size, 9
        end
    end
  end

  private 
    def set_xml_header(xml_doc)
      @request.env["HTTP_ACCEPT"] = "application/xml"
      @request.env["RAW_POST_DATA"] = xml_doc 
    end
end
