import * as assert from 'assert';
import * as vscode from 'vscode';
import * as myExtension from '../extension';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('flatten-json.flatten command is registered', async () => {
		const context = {
			subscriptions: [],
			globalState: {
				get: () => undefined,
				update: async () => {},
			},
		} as unknown as vscode.ExtensionContext;

		myExtension.activate(context);
		try {
			const commands = await vscode.commands.getCommands(true);
			assert.ok(commands.includes('flatten-json.flatten'));
		} finally {
			context.subscriptions.forEach(subscription => subscription.dispose());
		}
	});
});
