import { readStringParam } from "../../agents/tools/common.js";
import type {
  ChannelId,
  ChannelThreadingAdapter,
  ChannelThreadingToolContext,
} from "../../channels/plugins/types.public.js";
import type { ReplyToMode } from "../../config/types.js";
import type { OpenClawConfig } from "../../config/types.openclaw.js";
import type {
  OutboundSessionRoute,
  ResolveOutboundSessionRouteParams,
} from "./outbound-session.js";
import type { ResolvedMessagingTarget } from "./target-resolver.js";

type ResolveAutoThreadId = NonNullable<ChannelThreadingAdapter["resolveAutoThreadId"]>;

export function resolveAndApplyOutboundThreadId(
  actionParams: Record<string, unknown>,
  context: {
    cfg: OpenClawConfig;
    to: string;
    accountId?: string | null;
    toolContext?: ChannelThreadingToolContext;
    resolveAutoThreadId?: ResolveAutoThreadId;
  },
): string | undefined {
  const threadId = readStringParam(actionParams, "threadId");
  const resolved =
    threadId ??
    context.resolveAutoThreadId?.({
      cfg: context.cfg,
      accountId: context.accountId,
      to: context.to,
      toolContext: context.toolContext,
      replyToId: readStringParam(actionParams, "replyTo"),
    });
  if (resolved && !actionParams.threadId) {
    actionParams.threadId = resolved;
  }
  return resolved ?? undefined;
}

function isSameConversationTarget(
  actionParams: Record<string, unknown>,
  toolContext?: ChannelThreadingToolContext,
): boolean {
  const currentChannelId = toolContext?.currentChannelId?.trim();
  if (!currentChannelId) {
    return false;
  }
  const explicitTarget =
    readStringParam(actionParams, "target") ??
    readStringParam(actionParams, "to") ??
    readStringParam(actionParams, "channelId");
  if (!explicitTarget) {
    return true;
  }
  return explicitTarget.trim() === currentChannelId;
}

export type OutboundReplyToResolutionDebug = {
  explicitReplyToId?: string;
  sameConversationTarget: boolean;
  currentMessageId?: string;
  replyToMode: ReplyToMode;
  hasReplied: boolean | null;
  reason:
    | "explicit"
    | "different-conversation"
    | "missing-current-message"
    | "mode-off"
    | "mode-batched"
    | "already-replied"
    | "empty-current-message"
    | "implicit";
  resolvedReplyToId?: string;
};

export function inspectOutboundReplyToIdResolution(
  actionParams: Record<string, unknown>,
  context: {
    toolContext?: ChannelThreadingToolContext;
  },
): OutboundReplyToResolutionDebug {
  const explicitReplyToId = readStringParam(actionParams, "replyTo");
  const currentMessageId =
    context.toolContext?.currentMessageId == null
      ? undefined
      : typeof context.toolContext.currentMessageId === "number"
        ? String(context.toolContext.currentMessageId)
        : context.toolContext.currentMessageId;
  if (explicitReplyToId) {
    return {
      explicitReplyToId,
      sameConversationTarget: isSameConversationTarget(actionParams, context.toolContext),
      currentMessageId,
      replyToMode: context.toolContext?.replyToMode ?? "off",
      hasReplied:
        typeof context.toolContext?.hasRepliedRef?.value === "boolean"
          ? context.toolContext.hasRepliedRef.value
          : null,
      reason: "explicit",
      resolvedReplyToId: explicitReplyToId,
    };
  }

  const sameConversationTarget = isSameConversationTarget(actionParams, context.toolContext);
  const replyToMode = context.toolContext?.replyToMode ?? "off";
  const hasReplied =
    typeof context.toolContext?.hasRepliedRef?.value === "boolean"
      ? context.toolContext.hasRepliedRef.value
      : null;

  if (!sameConversationTarget) {
    return {
      sameConversationTarget,
      currentMessageId,
      replyToMode,
      hasReplied,
      reason: "different-conversation",
    };
  }

  if (currentMessageId == null) {
    return {
      sameConversationTarget,
      currentMessageId,
      replyToMode,
      hasReplied,
      reason: "missing-current-message",
    };
  }

  if (replyToMode === "off") {
    return {
      sameConversationTarget,
      currentMessageId,
      replyToMode,
      hasReplied,
      reason: "mode-off",
    };
  }

  if (replyToMode === "batched") {
    return {
      sameConversationTarget,
      currentMessageId,
      replyToMode,
      hasReplied,
      reason: "mode-batched",
    };
  }

  if (replyToMode === "first" && context.toolContext?.hasRepliedRef?.value) {
    return {
      sameConversationTarget,
      currentMessageId,
      replyToMode,
      hasReplied,
      reason: "already-replied",
    };
  }

  const resolvedReplyToId =
    typeof currentMessageId === "number" ? String(currentMessageId) : currentMessageId.trim();
  if (!resolvedReplyToId) {
    return {
      sameConversationTarget,
      currentMessageId,
      replyToMode,
      hasReplied,
      reason: "empty-current-message",
    };
  }

  return {
    sameConversationTarget,
    currentMessageId,
    replyToMode,
    hasReplied,
    reason: "implicit",
    resolvedReplyToId,
  };
}

export function resolveAndApplyOutboundReplyToId(
  actionParams: Record<string, unknown>,
  context: {
    toolContext?: ChannelThreadingToolContext;
  },
): string | undefined {
  const inspection = inspectOutboundReplyToIdResolution(actionParams, context);
  if (inspection.reason === "explicit") {
    return inspection.resolvedReplyToId;
  }
  if (inspection.reason !== "implicit") {
    return undefined;
  }
  if (inspection.replyToMode === "first") {
    const hasRepliedRef = context.toolContext?.hasRepliedRef;
    if (hasRepliedRef) {
      hasRepliedRef.value = true;
    }
  }
  const resolvedReplyToId = inspection.resolvedReplyToId;
  if (!resolvedReplyToId) {
    return undefined;
  }
  actionParams.replyTo = resolvedReplyToId;
  return resolvedReplyToId;
}

export async function prepareOutboundMirrorRoute(params: {
  cfg: OpenClawConfig;
  channel: ChannelId;
  to: string;
  actionParams: Record<string, unknown>;
  accountId?: string | null;
  toolContext?: ChannelThreadingToolContext;
  agentId?: string;
  currentSessionKey?: string;
  dryRun?: boolean;
  resolvedTarget?: ResolvedMessagingTarget;
  resolveAutoThreadId?: ResolveAutoThreadId;
  resolveOutboundSessionRoute: (
    params: ResolveOutboundSessionRouteParams,
  ) => Promise<OutboundSessionRoute | null>;
  ensureOutboundSessionEntry: (params: {
    cfg: OpenClawConfig;
    channel: ChannelId;
    accountId?: string | null;
    route: OutboundSessionRoute;
  }) => Promise<void>;
}): Promise<{
  resolvedThreadId?: string;
  outboundRoute: OutboundSessionRoute | null;
}> {
  const replyToId = readStringParam(params.actionParams, "replyTo");
  const resolvedThreadId = resolveAndApplyOutboundThreadId(params.actionParams, {
    cfg: params.cfg,
    to: params.to,
    accountId: params.accountId,
    toolContext: params.toolContext,
    resolveAutoThreadId: params.resolveAutoThreadId,
  });
  const outboundRoute =
    params.agentId && !params.dryRun
      ? await params.resolveOutboundSessionRoute({
          cfg: params.cfg,
          channel: params.channel,
          agentId: params.agentId,
          accountId: params.accountId,
          target: params.to,
          currentSessionKey: params.currentSessionKey,
          resolvedTarget: params.resolvedTarget,
          replyToId,
          threadId: resolvedThreadId,
        })
      : null;
  if (outboundRoute && params.agentId && !params.dryRun) {
    await params.ensureOutboundSessionEntry({
      cfg: params.cfg,
      channel: params.channel,
      accountId: params.accountId,
      route: outboundRoute,
    });
  }
  if (outboundRoute && !params.dryRun) {
    params.actionParams.__sessionKey = outboundRoute.sessionKey;
  }
  if (params.agentId) {
    params.actionParams.__agentId = params.agentId;
  }
  return {
    resolvedThreadId,
    outboundRoute,
  };
}
