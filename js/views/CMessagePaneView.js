'use strict';

var
	_ = require('underscore'),
	ko = require('knockout'),
	
	TextUtils = require('%PathToCoreWebclientModule%/js/utils/Text.js'),
	
	Ajax = require('%PathToCoreWebclientModule%/js/Ajax.js'),
	ModulesManager = require('%PathToCoreWebclientModule%/js/ModulesManager.js'),
	MailCache = null
;

function GetPlainText(sHtml)
{
	if (typeof(sHtml) !=='string')
	{
		return '';
	}
	return sHtml
		.replace(/\r\n/g, ' ')
		.replace(/\n/g, ' ')
		.replace(/<style[^>]*>[^<]*<\/style>/gi, '\n')
		.replace(/<br *\/{0,1}>/gi, '\n')
		.replace(/<\/p>/gi, '\n')
		.replace(/<a [^>]*href="([^"]*?)"[^>]*>(.*?)<\/a>/gi, '$2 ($1)')
		.replace(/<[^>]*>/g, '')
		.replace(/&nbsp;/g, ' ')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&amp;/g, '&')
		.replace(/&quot;/g, '"')
	;
};

/**
 * @constructor
 * @param {object} oMailCache
 * @param {function} fRouteMessageView
 */
function CMessagePaneView(oMailCache, fRouteMessageView)
{
	MailCache = oMailCache;
	this.fRouteMessageView = fRouteMessageView;
	this.currentMessage = MailCache.currentMessage;
	this.currentMessage.subscribe(this.onCurrentMessageSubscribe, this);
	this.messageText = ko.observable('');
	this.messageText.focused = ko.observable(false);
	ko.computed(function () {
		this.messageText();
		this.messageText.focused(true);
	}, this).extend({ throttle: 5 }); ;
	this.isLoading = ko.observable(false);
	this.isSaving = ko.observable(false);
	this.createMode = ko.observable(false);
	this.saveButtonText = ko.computed(function () {
		return this.isSaving() ? TextUtils.i18n('COREWEBCLIENT/ACTION_SAVE_IN_PROGRESS') : TextUtils.i18n('COREWEBCLIENT/ACTION_SAVE');
	}, this);
}

CMessagePaneView.prototype.ViewTemplate = '%ModuleName%_MessagePaneView';
CMessagePaneView.prototype.ViewConstructorName = 'CMessagePaneView';

CMessagePaneView.prototype.onCurrentMessageSubscribe = function ()
{
	var oMessage = this.currentMessage();
	if (oMessage)
	{
		this.messageText(GetPlainText(oMessage.textRaw()));
		this.isLoading(oMessage.uid() !== '' && !oMessage.completelyFilled());
		if (!oMessage.completelyFilled())
		{
			var sbscr = oMessage.completelyFilled.subscribe(function () {
				this.onCurrentMessageSubscribe();
				sbscr.dispose();
			}, this);
		}
		this.isSaving(false);
	}
};

/**
 * @param {Object} $MailViewDom
 */
CMessagePaneView.prototype.onBind = function ($MailViewDom)
{
	ModulesManager.run('SessionTimeoutWeblient', 'registerFunction', [_.bind(function () {
		this.saveNote();
	}, this)]);
	
	$(document).on('keydown', $.proxy(function(ev) {
		if (ev.ctrlKey && ev.keyCode === Enums.Key.s)
		{
			ev.preventDefault();
			this.saveNote();
		}
	}, this));
};

CMessagePaneView.prototype.onRoute = function (aParams, oParams)
{
	MailCache.setCurrentMessage(oParams.Uid, oParams.Folder);
	if (oParams.Custom === 'create-note')
	{
		this.messageText('');
		this.createMode(true);
	}
	else
	{
		this.createMode(false);
	}
	this.isSaving(false);
};

CMessagePaneView.prototype.saveNote = function ()
{
	if (this.createMode())
	{
		this.saveNewNote();
	}
	else
	{
		this.saveEditedNote();
	}
};

CMessagePaneView.prototype.saveNewNote = function ()
{
	var
		oFolder = MailCache.getCurrentFolder(),
		oParameters = {
			'AccountId': MailCache.currentAccountId(),
			'FolderFullName': oFolder.fullName(),
			'Text': this.messageText().replace(/\n/g, '<br />').replace(/\r\n/g, '<br />'),
			'Subject': this.messageText().replace(/\r\n/g, ' ').replace(/\n/g, ' ').substring(0, 50)
		}
	;
	this.isSaving(true);
	Ajax.send('%ModuleName%', 'SaveNote', oParameters, function (oResponse) {
		this.isSaving(false);
		if (oResponse.Result)
		{
			var sbscr = MailCache.messagesLoading.subscribe(function () {
				if (!MailCache.messagesLoading())
				{
					this.fRouteMessageView(oParameters.FolderFullName, oResponse.Result);
					sbscr.dispose();
				}
			}, this);
		}
		MailCache.executeCheckMail(true);
	}, this);
};

CMessagePaneView.prototype.saveEditedNote = function ()
{
	var oMessage = this.currentMessage();
	if (oMessage)
	{
		var
			oParameters = {
				'AccountId': oMessage.accountId(),
				'FolderFullName': oMessage.folder(),
				'MessageUid': oMessage.uid(),
				'Text': this.messageText().replace(/\n/g, '<br />').replace(/\r\n/g, '<br />'),
				'Subject': this.messageText().replace(/\r\n/g, ' ').replace(/\n/g, ' ').substring(0, 50)
			},
			oFolder = MailCache.getFolderByFullName(oMessage.accountId(), oMessage.folder())
		;
		oFolder.markDeletedByUids([oMessage.uid()]);
		MailCache.excludeDeletedMessages();
		this.isSaving(true);
		Ajax.send('%ModuleName%', 'SaveNote', oParameters, function (oResponse) {
			this.isSaving(false);
			if (oResponse.Result)
			{
				var sbscr = MailCache.messagesLoading.subscribe(function () {
					if (!MailCache.messagesLoading())
					{
						this.fRouteMessageView(oParameters.FolderFullName, oResponse.Result);
						sbscr.dispose();
					}
				}, this);
			}
			MailCache.executeCheckMail(true);
		}, this);
	}
};

CMessagePaneView.prototype.cancel = function ()
{
	ModulesManager.run('MailWebclient', 'setCustomRouting', ['Notes', 1, '', '', '', '']);
};

module.exports = CMessagePaneView;
