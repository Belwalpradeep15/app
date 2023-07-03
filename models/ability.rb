class Ability
  include CanCan::Ability

  def initialize(user)
    # Define abilities for the passed in user here. For example:
    #
    #   user ||= User.new # guest user (not logged in)
    #   if user.admin?
    #     can :manage, :all
    #   else
    #     can :read, :all
    #   end
    #
    # The first argument to `can` is the action you are giving the user
    # permission to do.
    # If you pass :manage it will apply to every action. Other common actions
    # here are :read, :create, :update and :destroy.
    #
    # The second argument is the resource the user can perform the action on.
    # If you pass :all it will apply to every resource. Otherwise pass a Ruby
    # class of the resource.
    #
    # The third argument is an optional hash of conditions to further filter the
    # objects.
    # For example, here the user can only update published articles.
    #
    #   can :update, Article, :published => true
    #
    # See the wiki for details:
    # https://github.com/CanCanCommunity/cancancan/wiki/Defining-Abilities

    if user.present?
      if user.is_a? :system_admin
        system_admin_permissions
      elsif user.is_a? :organisation_admin
        organization_admin_permissions
      elsif user.is_a? :organization_tech
        organization_tech_permissions
      elsif user.is_a? :basic_user
        basic_user_permissions
      else
        anonymous_permissions
      end
    else
      anonymous_permissions
    end
  end

 def system_admin_permissions
    can :manage,                                            [:organizations, :users, :webserver]
    can [:manage, :read, :add, :delete, :calibrate],        :fibre_lines
    can [:manage, :read, :add, :delete],                    :paths
    can [:manage, :restart],                                :helios_units
    can [:restart],                                         :panoptes_unit
    can [:manage],                                          :panoptes_units # Aggregate units
    can :restart,                                           :laser
    can :manage,                                            :event_clearing
    can :manage,                                            :event_types
    can [:read, :acknowledge, :respond, :manage],           :alerts
    can :manage,                                            :events
    can :manage,                                            :system_preferences
    can :trigger,                                           :system_check
    can :manage,                                            :notifications
    can :manage,                                            :system
    can [:manage, :trigger],                                :alert_configurations
    can :trigger,                                           :purge
    can :manage,                                            :schedules
    can :manage,                                            :company
    can :manage,                                            :markers
    can :manage,                                            :marker_types
    can :trigger,                                           :save_db
    can :trigger,                                           :wipe_db
    can :trigger,                                           :restore_db
  end

  def organization_admin_permissions
    can :manage,                            :users
    can [:manage, :read],                   :fibre_lines
    can [:manage, :read],                   :paths
    can :manage,                            :company
    can :trigger,                           :system_check
    can :manage,                            :notifications
    can [:manage, :trigger],                :alert_configurations
    can :trigger,                           :purge
    can :restart,                           :panoptes_unit
    can :manage,                            :markers
    can :manage,                            :marker_types
    can [:read, :acknowledge, :respond],    :alerts
  end

  def organization_tech_permissions
    can [:manage, :read],                   :fibre_lines
    can [:manage, :read],                   :paths
    can [:read, :restart],                  :helios_units
    can :restart,                           :laser
    can [:read, :acknowledge, :respond],    :alerts
    can :trigger,                           :system_check
    can :manage,                            :schedules
    can :manage,                            :markers
    can :manage,                            :marker_types
  end

  def basic_user_permissions
    can :read,                              :fibre_lines
    can :read,                              :paths
    can :read,                              :helios_units
    can [:read, :acknowledge],              :alerts
    can :read,                              :markers
    can :read,                              :marker_types
  end

  def anonymous_permissions
    can :read,  :fibre_lines
    can :read,  :paths
    can :read,  :alerts
  end

end
