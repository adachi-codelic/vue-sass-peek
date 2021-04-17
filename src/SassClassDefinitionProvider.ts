import * as vscode from 'vscode'
import { regexp, rest, string } from 'parjs'
import {
  many,
  map,
  or,
  qthen,
  thenq,
  manyTill,
  then,
  backtrack,
  recover
} from 'parjs/combinators'
import { Parjser } from 'parjs/index'
import * as pos from 'parjs/internal/parsers/position'
import * as nl from 'parjs/internal/parsers/newline'
import { space } from 'parjs/internal/parsers/char-types'
import { SassClass } from './SassClass'

export class SassClassDefinitionProvider implements vscode.DefinitionProvider {
  constructor () {}

  genSassClassDefinitionsFromText (text: string): SassClass[] {
    const classIdentifier = pos.position().pipe(then(regexp(/\S*/)))

    const spaces = space().pipe(many())

    const softFailureValue: [number, string[]] = [0, ['']]

    const sassClassName = spaces
      .pipe(qthen(string('.')))
      .pipe(qthen(classIdentifier))
      .pipe(thenq(spaces))
      .pipe(thenq(nl.newline()))
      .pipe(recover(_ => ({ kind: 'Soft', value: softFailureValue })))

    const styleOpenTag = regexp(/\s*<style.*>\s*/)
    const styleCloseTag = spaces
      .pipe(then(string('</style>')))
      .pipe(then(spaces))
      .pipe(then(nl.newline()))
      .pipe(recover(_ => ({ kind: 'Soft', value: softFailureValue })))

    const sassClassContentLine = spaces
      .pipe(qthen(regexp(/.*/)))
      .pipe(thenq(nl.newline()))
      .pipe(map(val => val[0]))

    const singleSassClass = sassClassContentLine
      .pipe(manyTill(sassClassName.pipe(backtrack())))
      .pipe(qthen(sassClassName))
      .pipe(
        then(
          sassClassContentLine.pipe(
            manyTill(styleCloseTag.pipe(or(sassClassName)).pipe(backtrack()))
          )
        )
      )
      .pipe(then(pos.position()))

    const sassClasses: Parjser<[
      [[number, string[]], string[]],
      number
    ][]> = singleSassClass.pipe(manyTill(styleCloseTag.pipe(backtrack())))

    const sassParser = sassClasses.pipe(
      map(val => {
        return val.map(
          values =>
            new SassClass(
              values[0][0][1][0],
              values[0][1],
              values[0][0][0],
              values[1]
            )
        )
      })
    )
    const otherPrevText = regexp(/(.*)/)
      .pipe(then(nl.newline()))
      .pipe(manyTill(styleOpenTag))

    const vueSassParser = otherPrevText
      .pipe(qthen(sassParser))
      .pipe(thenq(styleCloseTag))
      .pipe(thenq(rest()))

    const sassClassesParjser = vueSassParser.parse(text)

    console.log(sassClassesParjser)

    return sassClassesParjser.isOk ? sassClassesParjser.value : []
  }
  provideDefinition (
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ) {
    const targetText = document.getText()

    const editor = vscode.window.activeTextEditor
    const selection = document.getWordRangeAtPosition(
      editor?.selection.active ?? new vscode.Position(0, 0)
    )
    const selectedText = document.getText(selection)
    return this.genSassClassDefinitionsFromText(targetText)
      .filter(sassClass => sassClass.className === selectedText)
      .map(
        targetSassClass =>
          new vscode.Location(
            document.uri,
            new vscode.Range(
              document.positionAt(targetSassClass.start),
              document.positionAt(targetSassClass.end)
            )
          )
      )
  }
}
