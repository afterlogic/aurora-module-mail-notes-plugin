'use strict';

var
	ko = require('knockout'),
	
	Ajax = require('%PathToCoreWebclientModule%/js/Ajax.js'),
	MailCache = null
;

function GetPlainText(sHtml)
{
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
	this.isLoading = ko.observable(false);
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
	}
	
};

CMessagePaneView.prototype.onRoute = function (aParams, oParams)
{
	MailCache.setCurrentMessage(oParams.Uid, oParams.Folder);
};

CMessagePaneView.prototype.saveNote = function ()
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
		Ajax.send('%ModuleName%', 'SaveNote', oParameters, function (oResponse) {
			if (oResponse.Result)
			{
				var sbscr = MailCache.messagesLoading.subscribe(function () {
					if (!MailCache.messagesLoading())
					{
						this.fRouteMessageView(oMessage.folder(), oResponse.Result);
						sbscr.dispose();
					}
				}, this);
			}
			MailCache.executeCheckMail(true);
		}, this);
	}
};

module.exports = CMessagePaneView;
