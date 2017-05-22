'use strict';

module.exports = function (oAppData) {
	var
		ko = require('knockout'),
		_ = require('underscore'),
				
		App = require('%PathToCoreWebclientModule%/js/App.js'),

		bNormalUser = App.getUserRole() === Enums.UserRole.NormalUser
	;
	
	if (bNormalUser)
	{
		return {
			start: function () {
				App.subscribeEvent('MailWebclient::ConstructView::before', function (oParams) {
					if (oParams.Name === 'CMailView')
					{
						var
							koCurrentFolder = ko.computed(function () {
								return oParams.MailCache.folderList().currentFolder();
							}),
							CMessagePaneView = require('modules/%ModuleName%/js/views/CMessagePaneView.js'),
							oMessagePane = new CMessagePaneView(oParams.MailCache, _.bind(oParams.View.routeMessageView, oParams.View))
						;
						koCurrentFolder.subscribe(function () {
							var sFullName = koCurrentFolder() ? koCurrentFolder().fullName() : '';
							if (sFullName === 'Notes')
							{
								oParams.View.setCustomPreviewPane('%ModuleName%', oMessagePane);
							}
							else
							{
								oParams.View.removeCustomPreviewPane('%ModuleName%');
							}
						});
					}
				});
			}
		};
	}
	
	return null;
};
