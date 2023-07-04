class AddMessageFormatToNotificationEmailLists < ActiveRecord::Migration[5.2]
  def self.up
    add_column :notification_email_lists, :message_format, :string, :default => 'Email', :null => false
  end

  def self.down
    remove_column :notification_email_lists, :message_format
  end
end
