export interface TemplateConfig {
  [key: string]: string,
}

export interface SourceConfig {
  content: string,
  data: TemplateConfig,
  source: string,
  target: string,
}

export interface ApiData {
  documents: TemplateConfig[],
}

export interface CollectionData {
  [key: string]: SourceConfig,
}
