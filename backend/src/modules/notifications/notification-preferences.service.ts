import { BadRequestException, Injectable } from "@nestjs/common";

import type { AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import { PlatformConfigurationService } from "../platform-configuration/platform-configuration.service";
import { SMS_TEMPLATE_CATALOG, smsSpecFor } from "./sms-template-catalog";
import { specFor, TEMPLATE_CATALOG } from "./template-catalog";

interface StoredPreferences {
  /** Template codes the organisation has switched off. Everything not listed is on. */
  disabled: string[];
}

export const preferencesKey = (organisationId: string) => `notification_preferences:${organisationId}`;

/** Security, billing and verification mail is always sent. Only the optional kinds below can be turned off. Reports have their own settings. */
export function switchableCodes(): string[] {
  const email = Object.entries(TEMPLATE_CATALOG)
    .filter(([, spec]) => !spec.alwaysSend && spec.category !== "report")
    .map(([code]) => code);
  // Every text is optional: it costs money and needs the SMS add-on, so an organisation can always turn each kind off.
  return [...email, ...Object.keys(SMS_TEMPLATE_CATALOG)];
}

/**
 * Per-organisation switches for optional email. Held as an audited keyed setting (platform_configuration_setting, with its change
 * log), so no new table is needed: default is everything on, and a row exists only once an organisation changes something.
 */
@Injectable()
export class NotificationPreferencesService {
  constructor(private readonly config: PlatformConfigurationService) {}

  async disabledCodes(organisationId: string): Promise<string[]> {
    const stored = await this.config.getSetting<StoredPreferences>(preferencesKey(organisationId));
    return Array.isArray(stored?.disabled) ? stored.disabled : [];
  }

  /** True unless the template is optional and this organisation switched it off. */
  async isEnabled(organisationId: string, templateCode: string): Promise<boolean> {
    const spec = specFor(templateCode);
    if (spec?.alwaysSend) return true;
    if (!spec && !smsSpecFor(templateCode)) return true;
    return !(await this.disabledCodes(organisationId)).includes(templateCode);
  }

  async list(organisationId: string) {
    const disabled = new Set(await this.disabledCodes(organisationId));
    return switchableCodes().map((code) => {
      const sms = smsSpecFor(code);
      return {
        templateCode: code,
        channel: sms ? ("sms" as const) : ("email" as const),
        // The wording says how it is sent, because a list that mixes emails and texts must not leave that to the code.
        trigger: sms ? `By text message: ${sms.trigger}` : TEMPLATE_CATALOG[code].trigger,
        audience: sms ? sms.audience : TEMPLATE_CATALOG[code].audience,
        enabled: !disabled.has(code),
      };
    });
  }

  async update(
    organisationId: string,
    changes: Array<{ templateCode: string; enabled: boolean }>,
    user: AuthenticatedUser,
  ) {
    const allowed = new Set(switchableCodes());
    for (const change of changes) {
      if (!allowed.has(change.templateCode)) {
        throw new BadRequestException(`"${change.templateCode}" is always sent and cannot be switched off`);
      }
      if (typeof change.enabled !== "boolean") throw new BadRequestException("enabled must be true or false");
    }
    const disabled = new Set(await this.disabledCodes(organisationId));
    for (const change of changes) {
      if (change.enabled) disabled.delete(change.templateCode);
      else disabled.add(change.templateCode);
    }
    await this.config.setSetting(
      preferencesKey(organisationId),
      { disabled: [...disabled].sort() },
      user,
      "email preferences changed",
    );
    return this.list(organisationId);
  }
}
