'use strict';

module.exports = function (oAppData) {
	const
		_ = require('underscore'),
		ko = require('knockout'),
		
		TextUtils = require('%PathToCoreWebclientModule%/js/utils/Text.js'),
				
		App = require('%PathToCoreWebclientModule%/js/App.js'),

		ModulesManager = require('%PathToCoreWebclientModule%/js/ModulesManager.js'),
		Settings = require('modules/%ModuleName%/js/Settings.js'),

		sNotesName = 'Notes'
	;
	let	sNotesFullName = sNotesName;

	Settings.init(oAppData);

	const headerItem = require('modules/%ModuleName%/js/views/HeaderItemView.js');
	const itemToReturn = {
		item: headerItem,
		name: sNotesName,
	}

	function getHeaderItemFullName() {
		try {
			const URL_FRAGMENT = "#";
			const { HashModuleName } = ModulesManager.run('MailWebclient', 'getSettings');
			const accountHash = ModulesManager.run('MailWebclient', 'getAccountList').getCurrent().hash();
			return `${URL_FRAGMENT}${HashModuleName}/${accountHash}/${sNotesFullName}`;
		} catch (error) {
			return null;
		}
	}

	function SetNotesFolder(koFolderList) {
		const sNameSpace = koFolderList().sNamespaceFolder;
		const sDelimiter = koFolderList().sDelimiter;
	
		if (sNameSpace !== '') {
			sNotesFullName = sNameSpace + sDelimiter + sNotesName;
		}
		else {
			sNotesFullName = sNotesName;
		}
		const oNotesFolder = koFolderList().getFolderByFullName(sNotesFullName);
		if (oNotesFolder){
			oNotesFolder.displayName = ko.observable(TextUtils.i18n('%MODULENAME%/LABEL_FOLDER_NOTES'));
			oNotesFolder.usedAs = ko.observable(TextUtils.i18n('%MODULENAME%/LABEL_USED_AS_NOTES'));
		}
	}
	
	if (App.isUserNormalOrTenant()) {
		const moduleExports = {
			start: function (oModulesManager) {
				$('html').addClass('MailNotesPlugin');
				if(Settings.DisplayNotesButton){
					const mailCache = ModulesManager.run('MailWebclient', 'getMailCache');
					SetNotesFolder(mailCache.folderList);

					mailCache.folderList.subscribe(() => {
						const fullName = getHeaderItemFullName();
						if (fullName) {
							headerItem.hash(fullName);
						}
					});
				}
				App.subscribeEvent('MailWebclient::ConstructView::before', function (oParams) {
					if (oParams.Name === 'CMailView')
					{
						const
							koFolderList = oParams.MailCache.folderList,
							koCurrentFolder = ko.computed(function () {
								return oParams.MailCache.folderList().currentFolder();
							}),
							CMessagePaneView = require('modules/%ModuleName%/js/views/CMessagePaneView.js'),
							oMessagePane = new CMessagePaneView(oParams.MailCache, _.bind(oParams.View.routeMessageView, oParams.View))
						;
						SetNotesFolder(koFolderList);
						koFolderList.subscribe(function () {
							SetNotesFolder(koFolderList);
						});
						koCurrentFolder.subscribe(function () {
							const sFullName = koCurrentFolder() ? koCurrentFolder().fullName() : '';
							if (sFullName === sNotesFullName)
							{
								oParams.View.setCustomPreviewPane('%ModuleName%', oMessagePane);
								oParams.View.setCustomBigButton('%ModuleName%', function () {
									oModulesManager.run('MailWebclient', 'setCustomRouting', [sFullName, 1, '', '', '', 'create-note']);
								}, TextUtils.i18n('%MODULENAME%/ACTION_NEW_NOTE'));
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
				App.subscribeEvent('MailWebclient::ConstructView::after', function (oParams) {
					if (oParams.Name === 'CMessageListView' && oParams.MailCache)
					{
						const
							koCurrentFolder = ko.computed(function () {
								return oParams.MailCache.folderList().currentFolder();
							})
						;
						koCurrentFolder.subscribe(function () {
							const sFullName = koCurrentFolder() ? koCurrentFolder().fullName() : '';
							if (sFullName === sNotesFullName)
							{
								oParams.View.customMessageItemViewTemplate('%ModuleName%_MessageItemView');
							}
							else
							{
								oParams.View.customMessageItemViewTemplate('');
							}
						});
					}
				});
				App.subscribeEvent('MailWebclient::MessageDblClick::before', _.bind(function (oParams) {
					if (oParams.Message && oParams.Message.folder() === sNotesFullName)
					{
						oParams.Cancel = true;
					}
				}, this));
			},
		}
		if (Settings.DisplayNotesButton) {
			moduleExports.getHeaderItem = function () {
				try {
					const fullName = getHeaderItemFullName();
					headerItem.baseHash(fullName);
					return itemToReturn;
				} catch (error) {
					return null;
				}
			};
		}
		return moduleExports;
	}
	
	return null;
};
