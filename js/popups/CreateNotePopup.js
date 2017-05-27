'use strict';

var
	_ = require('underscore'),
	ko = require('knockout'),
	
	Ajax = require('%PathToCoreWebclientModule%/js/Ajax.js'),
	Api = require('%PathToCoreWebclientModule%/js/Api.js'),
	MailCache = null,
	
	CAbstractPopup = require('%PathToCoreWebclientModule%/js/popups/CAbstractPopup.js')
;

/**
 * @constructor
 */
function CCreateNotePopup()
{
	CAbstractPopup.call(this);
	
	this.messageText = ko.observable('');
}

_.extendOwn(CCreateNotePopup.prototype, CAbstractPopup.prototype);

CCreateNotePopup.prototype.PopupTemplate = '%ModuleName%_CreateNotePopup';

CCreateNotePopup.prototype.onShow = function (oMailCache, sFolder)
{
	MailCache = oMailCache;
	this.sFolder = sFolder;
};

CCreateNotePopup.prototype.onEnterHandler = function ()
{
	this.closePopup();
};

CCreateNotePopup.prototype.cancelPopup = function ()
{
	this.closePopup();
};

CCreateNotePopup.prototype.createNote = function ()
{
	if (MailCache !== null)
	{
		var
			oParameters = {
				'AccountId': MailCache.currentAccountId(),
				'FolderFullName': this.sFolder,
				'Text': this.messageText().replace(/\n/g, '<br />').replace(/\r\n/g, '<br />'),
				'Subject': this.messageText().replace(/\r\n/g, ' ').replace(/\n/g, ' ').substring(0, 50)
			}
		;
		Ajax.send('%ModuleName%', 'SaveNote', oParameters, function (oResponse) {
			if (oResponse.Result)
			{
				MailCache.executeCheckMail(true);
				this.closePopup();
			}
			else
			{
				Api.showErrorByCode(oResponse);
			}
		}, this);
	}
};

module.exports = new CCreateNotePopup();
