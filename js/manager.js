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
			start: function (oModulesManager) {
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
								oParams.View.setCustomBigButton('%ModuleName%', function () {
									oModulesManager.run('MailWebclient', 'setCustomRouting', [sFullName, 1, '', '', '', 'create-note']);
								}, 'New Note');
								oParams.View.resetDisabledTools('%ModuleName%', ['spam', 'move', 'mark']);
							}
							else
							{
								oParams.View.removeCustomPreviewPane('%ModuleName%');
								oParams.View.removeCustomBigButton('%ModuleName%');
								oParams.View.resetDisabledTools('%ModuleName%', []);
							}
						});
					}
				});
				App.subscribeEvent('MailWebclient::MessageDblClick::before', _.bind(function (oParams) {
					if (oParams.Message && oParams.Message.folder() === 'Notes')
					{
						oParams.Cancel = true;
					}
				}, this));
			}
		};
	}
	
	return null;
};
