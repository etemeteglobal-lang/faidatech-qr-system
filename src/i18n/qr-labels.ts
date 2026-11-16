import type { MessageKey } from "./messages";

const destinationMessageKeys: Record<string, MessageKey> = {
  URL: "purpose.landing",
  LANDING_PAGE: "purpose.landing",
  VCARD: "purpose.vcard",
  MENU: "purpose.menu",
  TOURISM_AUDIO: "purpose.tourism",
  PDF: "purpose.pdf",
  LOCAL_PAYMENTS: "purpose.payments",
};

export function qrDestinationMessageKey(destinationType: string): MessageKey | undefined {
  return destinationMessageKeys[destinationType];
}
