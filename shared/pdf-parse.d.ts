declare module "pdf-parse" {
  export interface TextResult {
    text: string;
  }

  export interface LoadParameters {
    data?: Buffer | Uint8Array | ArrayBuffer;
  }

  export class PDFParse {
    constructor(options: LoadParameters);
    getText(): Promise<TextResult>;
    destroy(): Promise<void>;
  }
}
