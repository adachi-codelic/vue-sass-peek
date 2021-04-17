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

  /**
   * generate array of Sass class definitions from text
   * @param {string} text - input source
   * @returns {SassClass} array of Sass class definition
   */
  genSassClassDefinitionsFromText (text: string): SassClass[] {
    // match an identifier of Sass class
    const classIdentifier: Parjser<[number, string]> = pos
      .position() // get the start position of the class definition
      .pipe(then(regexp(/\S*/).pipe(map(val => val[0]))))

    // match some spaces
    const spaces = space().pipe(many())

    // use for converting hard failures to soft failures
    // emulate "try" parser with using softFailure and backtrack() combinator
    const softFailureValue: [number, string][] = [[0, '']]

    // match a definition of Sass class name
    // support
    //  o - single defintion of the class
    //  o - multiple definitions of the classes
    //  x - nested class definitons
    const sassClassName: Parjser<[number, string][]> = spaces
      .pipe(qthen(string('.')))
      .pipe(qthen(classIdentifier))
      .pipe(thenq(spaces))
      .pipe(manyTill(nl.newline()))
      .pipe(recover(_ => ({ kind: 'Soft', value: softFailureValue })))

    // match a style tag
    const styleOpenTag = regexp(/\s*<style.*>\s*/)

    // match a style close tag
    const styleCloseTag = spaces
      .pipe(then(string('</styl>')))
      .pipe(then(spaces))
      .pipe(then(nl.newline()))
      .pipe(recover(_ => ({ kind: 'Soft', value: softFailureValue })))

    // match a line of Sass class content
    const sassClassContentLine: Parjser<string> = spaces
      .pipe(qthen(regexp(/.*/)))
      .pipe(thenq(nl.newline()))
      .pipe(map(val => val[0]))

    // match a sass class definition
    const singleSassClass: Parjser<[
      [[number, string][], string[]],
      number
    ]> = sassClassContentLine
      .pipe(manyTill(sassClassName.pipe(backtrack())))
      .pipe(qthen(sassClassName))
      .pipe(
        then(
          sassClassContentLine.pipe(
            manyTill(styleCloseTag.pipe(or(sassClassName)).pipe(backtrack()))
          )
        )
      )
      .pipe(then(pos.position())) // get the end position of the class definition

    // match all sass class definitions
    const sassClasses: Parjser<[
      [[number, string][], string[]],
      number
    ][]> = singleSassClass.pipe(manyTill(styleCloseTag.pipe(backtrack())))

    // convert to SassClass Object
    const sassParser = sassClasses.pipe(
      map(val =>
        val.reduce(
          (acc, sassDefinition) =>
            acc.concat(
              sassDefinition[0][0].map(
                sassClassName =>
                  new SassClass(
                    sassClassName[1],
                    sassDefinition[0][1],
                    sassClassName[0],
                    sassDefinition[1]
                  )
              )
            ),
          new Array<SassClass>()
        )
      )
    )
    // arbitrary texts before style open tag
    const otherPrevText = regexp(/(.*)/)
      .pipe(then(nl.newline()))
      .pipe(manyTill(styleOpenTag))

    // match a vue file text
    // does not support multiple style tags
    const vueSassParser = otherPrevText
      .pipe(qthen(sassParser))
      .pipe(thenq(styleCloseTag))
      .pipe(thenq(rest()))

    const sassClassesParjser = vueSassParser.parse(text)
    console.log(sassClassesParjser)

    return sassClassesParjser.isOk ? sassClassesParjser.value : []
  }

  /**
   * override provideDefinition
   * @param {TextDocument} document - target document
   * @param {Position} position - position
   * @param {CancellationToken} token - token
   * @returns {Location[]} array of locations of the definitions
   */
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
