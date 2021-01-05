// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { stdout } from 'process'
import * as vscode from 'vscode'
import {
  anyChar,
  anyCharOf,
  anyStringOf,
  eof,
  fail,
  float,
  letter,
  newline,
  noCharOf,
  regexp,
  string,
  stringLen,
  uniLetter,
  whitespace
} from 'parjs'
import {
  between,
  many,
  manySepBy,
  map,
  or,
  qthen,
  thenq,
  manyTill,
  recover,
  later,
  stringify,
  then,
  manyBetween,
  flatten,
  mapConst
} from 'parjs/combinators'
import { visualizeTrace } from 'parjs/trace'
import { ParjsSuccess } from 'parjs/internal/result'
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
// function parenthesize (
//   startSymbol: string,
//   text: string,
//   endSymbol: string
// ): string {
//   return startSymbol + text + endSymbol
// }

export function activate (context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('"vue-sass-peek" is now active!')

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  let disposable = vscode.commands.registerCommand(
    'vue-sass-peek.vue-sass-peek',
    () => {
      // The code you place here will be executed every time your command is executed
      // Display a message box to the user
      const text = vscode.window.activeTextEditor?.document.getText()
      const sass = text?.match(
        /<style lang="sass".*>(\r\n)*(\..*(\r\n)*)*<\/style>/
      )
      // console.log(sass)
      vscode.window.showInformationMessage('Hello World from vue-sass-peek!')
      // The module 'vscode' contains the VS Code extensibility API
      // Import the module and reference it with the alias vscode in your code below

      class SassClass {
        className: string
        classContent: string

        constructor (className: string, classContent: string) {
          this.className = className
          this.classContent = classContent
          return this
        }
      }

      const targetText = vscode.window.activeTextEditor?.document.getText()
      // const sassText = (targetText ?? '').match(
      //   /(?:<style.*>)((?<sassText>.*)|(?:\r\n))*(?:<\/style>)/
      // )
      // console.log(sassText)
      const classIdentifier = regexp(/.[^ \r\n]*/)
      const sassClassName = string('.')
        .pipe(qthen(classIdentifier))
        .pipe(between(whitespace()))
      const sassClassContent = regexp(/.[^\.<]*(?:\r\n)*/)
      const singleSassClass = sassClassName.pipe(then(sassClassContent))
      const sassComment = string('//').pipe(then(regexp(/.*\r\n/)))
      const sassClasses = sassComment
        .pipe(many())
        .pipe(qthen(singleSassClass.pipe(many())))
      const sassParser = sassClasses.pipe(
        map(val => {
          return val.map(values => {
            return new SassClass(values[0][0], values[1][0])
          })
        })
      )
      const styleOpenTag = regexp(/(\r\n)*<style.*>(\r\n)*/)
      const styleCloseTag = regexp(/(\r\n)*<\/style>(\r\n)*/)
      const otherPrevText = regexp(/(.*\r\n)/).pipe(manyTill(styleOpenTag))
      const otherAfterText = regexp(/(.*\r\n)/).pipe(manyTill(eof()))
      // const styleTag = sassClasses.pipe(between(styleOpenTag, styleCloseTag))
      const vueSassParser = otherPrevText
        .pipe(qthen(sassParser))
        .pipe(thenq(styleCloseTag))
        .pipe(thenq(otherAfterText))

      console.log(vueSassParser.parse(targetText ?? ''))
    }
  )
  context.subscriptions.push(disposable)
}

// this method is called when your extension is deactivated
export function deactivate () {}
