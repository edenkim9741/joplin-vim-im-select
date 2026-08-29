export enum ContentScriptType {
    CodeMirrorPlugin = 'codeMirrorPlugin',
}

export enum SettingItemType {
    Int = 1,
    String = 2,
    Bool = 3,
    Array = 4,
    Object = 5,
    Button = 6,
}

export enum SettingItemSubType {
    FilePathAndArgs = 'file_path_and_args',
    FilePath = 'file_path',
    DirectoryPath = 'directory_path',
}

export interface Script {
    onStart?(event?: unknown): Promise<void>;
}
