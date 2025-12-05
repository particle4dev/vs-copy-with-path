// src/__mocks__/vscode.ts

export const window = {
  showErrorMessage: jest.fn(),
  showWarningMessage: jest.fn(),
  showInformationMessage: jest.fn(),
  activeTextEditor: undefined,
};

export const workspace = {
  getConfiguration: jest.fn().mockReturnValue({
    get: jest.fn((key, defaultValue) => defaultValue),
  }),
  getWorkspaceFolder: jest.fn(),
  asRelativePath: jest.fn((uri) => uri.path), // Simple mock
  fs: {
    stat: jest.fn(),
    readFile: jest.fn(),
  },
  findFiles: jest.fn(),
};

export const commands = {
  registerCommand: jest.fn(),
  executeCommand: jest.fn(),
};

export const env = {
  clipboard: {
    writeText: jest.fn(),
  },
};

// Minimal implementation of Uri
export class Uri {
  scheme: string;
  authority: string;
  path: string;
  query: string;
  fragment: string;
  fsPath: string;

  constructor(scheme: string, authority: string, path: string, query: string, fragment: string) {
    this.scheme = scheme;
    this.authority = authority;
    this.path = path;
    this.query = query;
    this.fragment = fragment;
    this.fsPath = path;
  }

  static file(path: string) {
    return new Uri('file', '', path, '', '');
  }

  static parse(path: string) {
    return new Uri('file', '', path, '', '');
  }

  static joinPath(uri: Uri, ...paths: string[]) {
    return new Uri(uri.scheme, uri.authority, uri.path + '/' + paths.join('/'), uri.query, uri.fragment);
  }

  toString() {
    return this.path;
  }
}

export class RelativePattern {
  base: string;
  pattern: string;
  constructor(base: any, pattern: string) {
    this.base = base;
    this.pattern = pattern;
  }
}

export enum FileType {
  Unknown = 0,
  File = 1,
  Directory = 2,
  SymbolicLink = 64,
}
