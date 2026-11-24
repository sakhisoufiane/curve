export class FieldExtractor {
  private substrStart: number;

  private string: string;

  constructor(string: string) {
    this.string = string;
    this.substrStart = 0;
  }

  extractString(chars: number): string {
    const extracted = this.string.slice(this.substrStart, this.substrStart + chars);
    this.substrStart += chars;
    return extracted.trim();
  }
}
