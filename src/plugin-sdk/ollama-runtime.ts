// Manual facade. Keep loader boundary explicit.
import type { ModelDefinitionConfig } from "../config/types.js";
import {
  createLazyFacadeValue,
  loadBundledPluginPublicSurfaceModuleSync,
} from "./facade-runtime.js";

export type OllamaTagModel = {
  name: string;
  modified_at?: string;
  size?: number;
  digest?: string;
  remote_host?: string;
  details?: {
    family?: string;
    parameter_size?: string;
  };
};

export type OllamaTagsResponse = {
  models?: OllamaTagModel[];
};

export type OllamaModelShowInfo = {
  contextWindow?: number;
  capabilities?: string[];
};

export type OllamaModelWithContext = OllamaTagModel & {
  contextWindow?: number;
  capabilities?: string[];
};

type FacadeModule = {
  OLLAMA_DEFAULT_BASE_URL: string;
  OLLAMA_DEFAULT_CONTEXT_WINDOW: number;
  OLLAMA_DEFAULT_MAX_TOKENS: number;
  OLLAMA_DEFAULT_MODEL: string;
  OLLAMA_DEFAULT_COST: ModelDefinitionConfig["cost"];
  buildOllamaModelDefinition: (
    modelId: string,
    contextWindow?: number,
    capabilities?: string[],
  ) => ModelDefinitionConfig;
  enrichOllamaModelsWithContext: (
    apiBase: string,
    models: OllamaTagModel[],
    opts?: { concurrency?: number },
  ) => Promise<OllamaModelWithContext[]>;
  fetchOllamaModels: (params?: { baseUrl?: string }) => Promise<OllamaTagsResponse>;
  isReasoningModelHeuristic: (modelId: string) => boolean;
  queryOllamaContextWindow: (apiBase: string, modelName: string) => Promise<number | undefined>;
  queryOllamaModelShowInfo: (apiBase: string, modelName: string) => Promise<OllamaModelShowInfo>;
  resolveOllamaApiBase: (configuredBaseUrl?: string) => string;
};

function loadFacadeModule(): FacadeModule {
  return loadBundledPluginPublicSurfaceModuleSync<FacadeModule>({
    dirName: "ollama",
    artifactBasename: "api.js",
  });
}

export const OLLAMA_DEFAULT_BASE_URL: FacadeModule["OLLAMA_DEFAULT_BASE_URL"] =
  "http://127.0.0.1:11434";
export const OLLAMA_DEFAULT_CONTEXT_WINDOW: FacadeModule["OLLAMA_DEFAULT_CONTEXT_WINDOW"] = 32_768;
export const OLLAMA_DEFAULT_MAX_TOKENS: FacadeModule["OLLAMA_DEFAULT_MAX_TOKENS"] = 8_192;
export const OLLAMA_DEFAULT_MODEL: FacadeModule["OLLAMA_DEFAULT_MODEL"] = "llama3.2:3b";
export const OLLAMA_DEFAULT_COST: FacadeModule["OLLAMA_DEFAULT_COST"] = {
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite: 0,
};

export const buildOllamaModelDefinition: FacadeModule["buildOllamaModelDefinition"] =
  createLazyFacadeValue(loadFacadeModule, "buildOllamaModelDefinition");
export const enrichOllamaModelsWithContext: FacadeModule["enrichOllamaModelsWithContext"] =
  createLazyFacadeValue(loadFacadeModule, "enrichOllamaModelsWithContext");
export const fetchOllamaModels: FacadeModule["fetchOllamaModels"] = createLazyFacadeValue(
  loadFacadeModule,
  "fetchOllamaModels",
);
export const isReasoningModelHeuristic: FacadeModule["isReasoningModelHeuristic"] =
  createLazyFacadeValue(loadFacadeModule, "isReasoningModelHeuristic");
export const queryOllamaContextWindow: FacadeModule["queryOllamaContextWindow"] =
  createLazyFacadeValue(loadFacadeModule, "queryOllamaContextWindow");
export const queryOllamaModelShowInfo: FacadeModule["queryOllamaModelShowInfo"] =
  createLazyFacadeValue(loadFacadeModule, "queryOllamaModelShowInfo");
export const resolveOllamaApiBase: FacadeModule["resolveOllamaApiBase"] = createLazyFacadeValue(
  loadFacadeModule,
  "resolveOllamaApiBase",
);
