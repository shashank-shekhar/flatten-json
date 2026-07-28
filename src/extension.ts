import * as vscode from 'vscode';
import { getLocation } from 'jsonc-parser';
import { flattenJson, parseJson } from './flatten';

export function activate(context: vscode.ExtensionContext) {
	const disposable = vscode.commands.registerCommand('flatten-json.flatten', () => runFlattenCommand(context));
	context.subscriptions.push(disposable);
}

export function deactivate() {}

async function runFlattenCommand(context: vscode.ExtensionContext): Promise<void> {
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

	let prefix: (string | number)[] = [];
	if (source === 'Active Selection') {
		const mode = await getSelectionMode(context);
		if (mode === undefined) {
			return;
		}
		if (mode === 'absolute') {
			prefix = getSelectionPrefix();
		}
	}

	const separator = await getSeparator(context);
	if (separator === undefined) {
		return;
	}

	let flattened: ReturnType<typeof flattenJson>;
	try {
		const parsed: unknown = parseJson(rawText);
		flattened = flattenJson(parsed, separator, prefix);
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

type SelectionMode = 'asis' | 'absolute';

interface SelectionModeQuickPickItem extends vscode.QuickPickItem {
	readonly mode: SelectionMode;
}

const LAST_SELECTION_MODE_KEY = 'flatten-json.lastSelectionMode';

const SELECTION_MODE_OPTIONS: readonly SelectionModeQuickPickItem[] = [
	{ label: 'Flatten as-is', description: 'Keys relative to the selection', mode: 'asis' },
	{ label: 'Flatten with absolute path', description: 'Prefix keys with the path from the document root', mode: 'absolute' },
];

async function getSelectionMode(context: vscode.ExtensionContext): Promise<SelectionMode | undefined> {
	const lastMode = context.globalState.get<SelectionMode>(LAST_SELECTION_MODE_KEY);
	const items = lastMode
		? [
			...SELECTION_MODE_OPTIONS.filter(o => o.mode === lastMode),
			...SELECTION_MODE_OPTIONS.filter(o => o.mode !== lastMode),
		]
		: SELECTION_MODE_OPTIONS;

	const picked = await vscode.window.showQuickPick(items, {
		placeHolder: 'Flatten the selection relative to itself or to the whole document?',
	});
	if (!picked) {
		return undefined;
	}

	await context.globalState.update(LAST_SELECTION_MODE_KEY, picked.mode);
	return picked.mode;
}

// The path of the selected value within the whole document, used to prefix the flattened keys.
function getSelectionPrefix(): (string | number)[] {
	const editor = vscode.window.activeTextEditor;
	if (!editor || editor.selection.isEmpty) {
		return [];
	}
	const startOffset = editor.document.offsetAt(editor.selection.start);
	const location = getLocation(editor.document.getText(), startOffset);
	// When the selection begins on a property key, its path points at that property — the
	// container that owns the selected keys is one level up.
	return location.isAtPropertyKey ? location.path.slice(0, -1) : location.path;
}

interface SeparatorQuickPickItem extends vscode.QuickPickItem {
	readonly separator: string;
}

const LAST_SEPARATOR_KEY = 'flatten-json.lastSeparator';

const SEPARATOR_OPTIONS: readonly SeparatorQuickPickItem[] = [
	{ label: ':', description: '[Colon]', separator: ':' },
	{ label: '.', description: '[Dot]', separator: '.' },
	{ label: '__', description: '[Double underscore]', separator: '__' },
	{ label: '/', description: '[Slash]', separator: '/' },
	{ label: '_', description: '[Single underscore]', separator: '_' },
	{ label: '-', description: '[Hyphen]', separator: '-' },
];

async function getSeparator(context: vscode.ExtensionContext): Promise<string | undefined> {
	const lastSeparator = context.globalState.get<string>(LAST_SEPARATOR_KEY);
	const items = lastSeparator
		? [
			...SEPARATOR_OPTIONS.filter(o => o.separator === lastSeparator),
			...SEPARATOR_OPTIONS.filter(o => o.separator !== lastSeparator),
		]
		: SEPARATOR_OPTIONS;

	const picked = await vscode.window.showQuickPick(items, { placeHolder: 'Select the key separator' });
	if (!picked) {
		return undefined;
	}

	await context.globalState.update(LAST_SEPARATOR_KEY, picked.separator);
	return picked.separator;
}
