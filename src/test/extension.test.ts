import * as assert from 'assert';
import * as vscode from 'vscode';
import * as myExtension from '../extension';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('to-secrets.flatten command is registered', async () => {
		myExtension.activate({ subscriptions: [] } as unknown as vscode.ExtensionContext);
		const commands = await vscode.commands.getCommands(true);
		assert.ok(commands.includes('to-secrets.flatten'));
	});
});
