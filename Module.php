<?php
/**
 * @copyright Copyright (c) 2017, Afterlogic Corp.
 * @license AGPL-3.0 or AfterLogic Software License
 *
 * This code is licensed under AGPLv3 license or AfterLogic Software License
 * if commercial version of the product was purchased.
 * For full statements of the licenses see LICENSE-AFTERLOGIC and LICENSE-AGPL3 files.
 */

namespace Aurora\Modules\MailNotesPlugin;

/**
 * @package Modules
 */
class Module extends \Aurora\System\Module\AbstractModule
{
	public function SaveNote($AccountId, $FolderFullName, $MessageUid, $Text)
	{
		$oMailDecorator = \Aurora\System\Api::GetModuleDecorator('Mail');
		$oApiAccountsManager = $oMailDecorator->GetManager('accounts');
		$oAccount = $oApiAccountsManager->getAccountById($AccountId);
		$oApiMailManager = $oMailDecorator->GetManager('main');
		$oOrigMessage = $oApiMailManager->getMessage($oAccount, $FolderFullName, $MessageUid);
		
		$oMessage = \MailSo\Mime\Message::NewInstance();
		$oMessage->RegenerateMessageId();
		$oFromCollection = $oOrigMessage->getFrom();
		if (isset($oFromCollection) && $oFromCollection->Count() > 0)
		{
			$oMessage->SetFrom($oFromCollection->GetByIndex(0));
		}
		$oToCollection = $oOrigMessage->getTo();
		if (isset($oToCollection) && $oToCollection->Count() > 0)
		{
			$oMessage->SetTo($oToCollection);
		}
		$oMessage
			->SetSubject($Text)
			->AddText($Text, true)
			->SetCustomHeader('X-Uniform-Type-Identifier', 'com.apple.mail-note')
			->SetCustomHeader('X-Universally-Unique-Identifier', uniqid())
		;
		$rMessageStream = \MailSo\Base\ResourceRegistry::CreateMemoryResource();
		$iMessageStreamSize = \MailSo\Base\Utils::MultipleStreamWriter(
			$oMessage->ToStream(true), array($rMessageStream), 8192, true, true, true);
		$iNewUid = 0;
		$oApiMailManager->appendMessageFromStream($oAccount, $rMessageStream, $FolderFullName, $iMessageStreamSize, $iNewUid);
		
		$oApiMailManager->deleteMessage($oAccount, $FolderFullName, array($MessageUid));
		
		return $iNewUid;
	}
}
