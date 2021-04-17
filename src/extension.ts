import * as vscode from 'vscode'
import { SassClassDefinitionProvider } from './SassClassDefinitionProvider'

export function activate (context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.languages.registerDefinitionProvider(
      { scheme: 'file', language: 'vue' },
      new SassClassDefinitionProvider()
    )
  )
}

export function deactivate () {}
