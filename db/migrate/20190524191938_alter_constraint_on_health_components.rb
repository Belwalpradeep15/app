class AlterConstraintOnHealthComponents < ActiveRecord::Migration[5.2]
  def up
  	execute <<-sql 
  	    ALTER TABLE health_components DROP CONSTRAINT health_components_component;
  	sql
  	
  	execute <<-sql
  		ALTER TABLE health_components ADD CONSTRAINT health_components_component CHECK (((component)::text = ANY (ARRAY[('cabinet'::character varying)::text, ('panoptes'::character varying)::text, ('helios'::character varying)::text, ('comms'::character varying)::text, ('relay'::character varying)::text, ('cable'::character varying)::text, ('panoptes_child'::character varying)::text])));
    sql
    
  end
end
