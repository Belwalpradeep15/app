function emailSupport(details_hash){
	details_hash = details_hash || {}

    var mailtoLink = "mailto:techsupport@fotechsolutions.com?subject=";
    mailtoLink = mailtoLink + encodeURIComponent(I18n.t('common.help.report_problem'))
    mailtoLink = mailtoLink + "&body=";
    mailtoLink = mailtoLink + encodeURIComponent([I18n.t('mailer.help.report_problem_blurb'),
              "",
              I18n.t('common.help.problem_description') + ": ",
              "","","","",
              I18n.t('common.help.contact_information') + ": ",
              "","","","",
              I18n.t('common.help.system_details') + ": ",
              "    " + I18n.t('common.headers.name') + ": " + details_hash['name'],
              "    " + I18n.t('common.headers.serial_number') + ": " + details_hash['serial_number'],
              "    " + I18n.t('common.headers.uuid') + ": " + details_hash['uuid'],
              "    " + I18n.t('main.about.version', {'version':details_hash['version']})
              ].join("\n"));
    document.location = mailtoLink;
}