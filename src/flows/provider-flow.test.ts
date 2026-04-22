import { beforeEach, describe, expect, it, vi } from "vitest";

type ResolveProviderInstallCatalogEntries =
  typeof import("../plugins/provider-install-catalog.js").resolveProviderInstallCatalogEntries;
type ResolveProviderWizardOptions =
  typeof import("../plugins/provider-wizard.js").resolveProviderWizardOptions;
type ResolveProviderModelPickerEntries =
  typeof import("../plugins/provider-wizard.js").resolveProviderModelPickerEntries;
type ResolvePluginProviders =
  typeof import("../plugins/providers.runtime.js").resolvePluginProviders;

const resolveProviderInstallCatalogEntries = vi.hoisted(() =>
  vi.fn<ResolveProviderInstallCatalogEntries>(() => []),
);
vi.mock("../plugins/provider-install-catalog.js", () => ({
  resolveProviderInstallCatalogEntries,
}));

const resolveProviderWizardOptions = vi.hoisted(() =>
  vi.fn<ResolveProviderWizardOptions>(() => []),
);
const resolveProviderModelPickerEntries = vi.hoisted(() =>
  vi.fn<ResolveProviderModelPickerEntries>(() => []),
);
vi.mock("../plugins/provider-wizard.js", () => ({
  resolveProviderWizardOptions,
  resolveProviderModelPickerEntries,
}));

const resolvePluginProviders = vi.hoisted(() => vi.fn<ResolvePluginProviders>(() => []));
vi.mock("../plugins/providers.runtime.js", () => ({
  resolvePluginProviders,
}));

import { resolveProviderSetupFlowContributions } from "./provider-flow.js";

describe("provider flow install catalog contributions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("surfaces install-catalog provider choices when runtime setup options are absent", () => {
    resolveProviderInstallCatalogEntries.mockReturnValue([
      {
        pluginId: "vllm",
        providerId: "vllm",
        methodId: "server",
        choiceId: "vllm",
        choiceLabel: "vLLM",
        choiceHint: "Local server",
        groupId: "vllm",
        groupLabel: "vLLM",
        onboardingScopes: ["text-inference"],
        label: "vLLM",
        origin: "bundled",
        install: {
          npmSpec: "@openclaw/vllm",
        },
      },
    ]);

    expect(resolveProviderSetupFlowContributions()).toEqual([
      {
        id: "provider:setup:vllm",
        kind: "provider",
        surface: "setup",
        providerId: "vllm",
        pluginId: "vllm",
        option: {
          value: "vllm",
          label: "vLLM",
          hint: "Local server",
          group: {
            id: "vllm",
            label: "vLLM",
          },
        },
        onboardingScopes: ["text-inference"],
        source: "install-catalog",
      },
    ]);
  });

  it("prefers runtime setup contributions over duplicate install-catalog entries", () => {
    resolveProviderWizardOptions.mockReturnValue([
      {
        value: "openai-api-key",
        label: "OpenAI API key",
        groupId: "openai",
        groupLabel: "OpenAI",
      },
    ]);
    resolveProviderInstallCatalogEntries.mockReturnValue([
      {
        pluginId: "openai",
        providerId: "openai",
        methodId: "api-key",
        choiceId: "openai-api-key",
        choiceLabel: "OpenAI API key",
        groupId: "openai",
        groupLabel: "OpenAI",
        label: "OpenAI",
        origin: "bundled",
        install: {
          npmSpec: "@openclaw/openai",
        },
      },
    ]);

    expect(resolveProviderSetupFlowContributions()).toEqual([
      {
        id: "provider:setup:openai-api-key",
        kind: "provider",
        surface: "setup",
        providerId: "openai",
        option: {
          value: "openai-api-key",
          label: "OpenAI API key",
          group: {
            id: "openai",
            label: "OpenAI",
          },
        },
        source: "runtime",
      },
    ]);
  });
});
