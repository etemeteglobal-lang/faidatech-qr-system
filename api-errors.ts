import type { ApiErrorEnvelope } from "@/lib/qr/client-types";
import type { MessageKey } from "./messages";
import type { Translate } from "./LocaleProvider";

const apiErrorKeys: Record<string, MessageKey> = {
  database_not_configured: "error.databaseNotConfigured",
  database_unavailable: "error.databaseUnavailable",
  unauthorized: "error.unauthorized",
  invalid_session: "error.unauthorized",
  expired_session: "error.unauthorized",
  authentication_not_configured: "error.unauthorized",
  validation_error: "error.validation",
  invalid_json: "error.invalidInput",
  qr_not_found: "error.notFound",
  campaign_not_found: "error.notFound",
  vcard_not_found: "error.notFound",
  invalid_vcard_payload: "visitor.destinationNeedsUpdate",
  oauth_state_invalid: "login.failed",
  oauth_exchange_failed: "login.failed",
  oauth_identity_failed: "login.failed",
  oauth_not_configured: "login.failed",
  organization_setup_failed: "error.general",
  empty_update: "error.invalidInput",
  internal_error: "error.general",
};

export function localizedApiError(
  body: ApiErrorEnvelope,
  fallbackKey: MessageKey,
  t: Translate,
): string {
  const code = body.error?.code;
  if (code && apiErrorKeys[code]) return t(apiErrorKeys[code]);
  if (body.error?.message) return t("error.general");
  return t(fallbackKey);
}
