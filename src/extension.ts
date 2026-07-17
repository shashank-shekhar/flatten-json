import * as vscode from 'vscode';
import { flattenToSecrets } from './flatten';

export function activate(context: vscode.ExtensionContext) {
	const disposable = vscode.commands.registerCommand('to-secrets.flatten', runFlattenCommand);
	context.subscriptions.push(disposable);
}

export function deactivate() {}

async function runFlattenCommand(): Promise<void> {
	const source = await vscode.window.showQuickPick(
		['Active Document', 'Active Selection', 'Clipboard', 'Pick a File...'],
		{ placeHolder: 'Select the JSON source to flatten' }
	);
	if (!source) {
		return;
	}

	const rawText = await getSourceText(source);
	if (rawText === undefined) {
		return;
	}

	let flattened: ReturnType<typeof flattenToSecrets>;
	try {
		const parsed: unknown = JSON.parse(rawText);
		flattened = flattenToSecrets(parsed);
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		vscode.window.showErrorMessage(`Could not flatten JSON: ${message}`);
		return;
	}

	const content = JSON.stringify(flattened, null, 2);
	const document = await vscode.workspace.openTextDocument({ content, language: 'json' });
	await vscode.window.showTextDocument(document);
}

async function getSourceText(source: string): Promise<string | undefined> {
	switch (source) {
		case 'Active Document': {
			const editor = vscode.window.activeTextEditor;
			if (!editor) {
				vscode.window.showErrorMessage('No active editor to read JSON from.');
				return undefined;
			}
			return editor.document.getText();
		}
		case 'Active Selection': {
			const editor = vscode.window.activeTextEditor;
			if (!editor) {
				vscode.window.showErrorMessage('No active editor to read JSON from.');
				return undefined;
			}
			if (editor.selection.isEmpty) {
				vscode.window.showErrorMessage('No text is selected.');
				return undefined;
			}
			return editor.document.getText(editor.selection);
		}
		case 'Clipboard': {
			const text = await vscode.env.clipboard.readText();
			if (text.trim().length === 0) {
				vscode.window.showErrorMessage('Clipboard is empty.');
				return undefined;
			}
			return text;
		}
		case 'Pick a File...': {
			const uris = await vscode.window.showOpenDialog({
				canSelectMany: false,
				filters: { JSON: ['json'] },
				openLabel: 'Select JSON file',
			});
			if (!uris || uris.length === 0) {
				return undefined;
			}
			try {
				const bytes = await vscode.workspace.fs.readFile(uris[0]);
				return new TextDecoder('utf-8').decode(bytes);
			} catch (err) {
				const message = err instanceof Error ? err.message : String(err);
				vscode.window.showErrorMessage(`Failed to read file: ${message}`);
				return undefined;
			}
		}
		default:
			return undefined;
	}
}
