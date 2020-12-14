export interface ApiData {
  documents: TemplateConfig[],
}

export interface CollectionData {
  [key: string]: SourceConfig,
}

export interface SourceConfig {
  content: string,
  documents?: string[],
  data: TemplateConfig,
  source: string,
  target: string,
}

export interface TemplateConfig {
  [key: string]: string,
}
