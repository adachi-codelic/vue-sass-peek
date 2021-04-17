export class SassClass {
  className: string
  classContent: string
  start: number
  end: number

  constructor (
    className: string,
    classContent: string[],
    start: number,
    end: number
  ) {
    this.className = className
    this.classContent = classContent.reduce((acc, content) => acc + content, '')
    this.start = start
    this.end = end
    return this
  }
}
