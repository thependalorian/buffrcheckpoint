import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, asc, eq, isNull } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import type { AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import type { Database } from "../../db/client";
import { DB } from "../../db/db.module";
import {
  organisationSettings,
  organisationUnits,
  organisationUnitStatusEvents,
  typeDefinition,
} from "../../db/schema";
import { TypeDefinitionLookupService } from "../../db/type-definition-lookup.service";

export type DirectoryModeCode = "custom" | "bian_aligned" | "hybrid";

export interface OrganisationUnitRow {
  id: string;
  parentId: string | null;
  unitKindCode: string;
  unitKindLabel: string;
  bianAreaCode: string | null;
  bianAreaLabel: string | null;
  code: string;
  name: string;
  description: string | null;
  sortOrder: number;
  siteId: string | null;
  children: OrganisationUnitRow[];
}

export interface CreateUnitInput {
  parentId?: string | null;
  unitKindCode: string;
  bianAreaCode?: string | null;
  code: string;
  name: string;
  description?: string | null;
  sortOrder?: number;
  siteId?: string | null;
}

/** Optional BIAN Business Area starter rows (Service Landscape columns). */
const BIAN_AREA_SEED: Array<{
  code: string;
  name: string;
  description: string;
  sortOrder: number;
  domains: Array<{ code: string; name: string; description: string; sortOrder: number }>;
}> = [
  {
    code: "reference_data",
    name: "Reference Data",
    description: "Internally and externally sourced reference information (Party, Market Data, Product Management).",
    sortOrder: 1,
    domains: [
      {
        code: "party",
        name: "Party",
        description: "Party reference data — people and legal entities.",
        sortOrder: 1,
      },
      {
        code: "product_management",
        name: "Product Management",
        description: "Product catalogue and reference offerings.",
        sortOrder: 2,
      },
    ],
  },
  {
    code: "sales_and_service",
    name: "Sales & Service",
    description: "Customer-facing sales and servicing across channels.",
    sortOrder: 2,
    domains: [
      { code: "customer_management", name: "Customer Management", description: "Customer relationship capabilities.", sortOrder: 1 },
      { code: "servicing", name: "Servicing", description: "In-force product servicing.", sortOrder: 2 },
    ],
  },
  {
    code: "operations_and_execution",
    name: "Operations & Execution",
    description: "Product fulfillment and shared cross-product operations.",
    sortOrder: 3,
    domains: [
      {
        code: "operational_services",
        name: "Operational Services",
        description: "Shared operational utilities including reception wait queue.",
        sortOrder: 1,
      },
    ],
  },
  {
    code: "risk_and_compliance",
    name: "Risk & Compliance",
    description: "Risk analysis, models, regulation and compliance.",
    sortOrder: 4,
    domains: [
      { code: "regulation_compliance", name: "Regulation & Compliance", description: "Regulatory and compliance functions.", sortOrder: 1 },
    ],
  },
  {
    code: "business_support",
    name: "Business Support",
    description: "IT, facilities, HR, communication, procurement, corporate relations.",
    sortOrder: 5,
    domains: [
      { code: "facilities", name: "Buildings, Equipment & Facilities", description: "Sites and reception.", sortOrder: 1 },
      {
        code: "communication_education",
        name: "Communication & Education",
        description: "Messaging — host email notifications map here.",
        sortOrder: 2,
      },
      { code: "human_resource_management", name: "Human Resource Management", description: "People / HR.", sortOrder: 3 },
      { code: "it_management", name: "IT Management", description: "IT operations.", sortOrder: 4 },
      { code: "finance_admin", name: "Finance", description: "Finance and accounting support.", sortOrder: 5 },
    ],
  },
];

/** Flat custom starter — no BIAN areas; orgs that do not follow BIAN. */
const CUSTOM_STARTER_DEPARTMENTS: Array<{ code: string; name: string; sortOrder: number }> = [
  { code: "reception", name: "Reception", sortOrder: 1 },
  { code: "general", name: "General", sortOrder: 2 },
  { code: "operations", name: "Operations", sortOrder: 3 },
  { code: "administration", name: "Administration", sortOrder: 4 },
];

@Injectable()
export class OrganisationDirectoryService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly typeDefs: TypeDefinitionLookupService,
  ) {}

  async getDirectory(user: AuthenticatedUser) {
    const mode = await this.resolveMode(user.organisationId);
    const rows = await this.db.query.organisationUnits.findMany({
      where: and(eq(organisationUnits.organisationId, user.organisationId), isNull(organisationUnits.deletedAt)),
      orderBy: [asc(organisationUnits.sortOrder), asc(organisationUnits.name)],
    });

    const defRows = await this.db.query.typeDefinition.findMany({
      where: isNull(typeDefinition.deletedAt),
    });
    const defById = new Map(defRows.map((d) => [d.id, d]));

    const flat = rows.map((r) => {
      const kind = defById.get(r.unitKindCode);
      const area = r.bianAreaCode ? defById.get(r.bianAreaCode) : undefined;
      return {
        id: r.id,
        parentId: r.parentId,
        unitKindCode: kind?.code ?? "department",
        unitKindLabel: kind?.label ?? "Department",
        bianAreaCode: area?.code ?? null,
        bianAreaLabel: area?.label ?? null,
        code: r.code,
        name: r.name,
        description: r.description,
        sortOrder: r.sortOrder,
        siteId: r.siteId,
        children: [] as OrganisationUnitRow[],
      } satisfies OrganisationUnitRow;
    });

    const byId = new Map(flat.map((n) => [n.id, n]));
    const roots: OrganisationUnitRow[] = [];
    for (const node of flat) {
      if (node.parentId && byId.has(node.parentId)) {
        byId.get(node.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return {
      mode: mode.code,
      modeLabel: mode.label,
      units: roots,
      flat: flat.map(({ children: _c, ...rest }) => rest),
      availableKinds: await this.listDomainCodes("organisation_unit_kind"),
      availableBianAreas: await this.listDomainCodes("bian_business_area"),
      availableModes: await this.listDomainCodes("organisation_directory_mode"),
    };
  }

  async setMode(modeCode: DirectoryModeCode, user: AuthenticatedUser) {
    const modeId = await this.typeDefs.id("organisation_directory_mode", modeCode);
    const existing = await this.db.query.organisationSettings.findFirst({
      where: eq(organisationSettings.organisationId, user.organisationId),
    });
    if (existing) {
      await this.db
        .update(organisationSettings)
        .set({ directoryTaxonomyModeCode: modeId, updatedAt: new Date() })
        .where(eq(organisationSettings.organisationId, user.organisationId));
    } else {
      await this.db.insert(organisationSettings).values({
        id: randomUUID(),
        organisationId: user.organisationId,
        directoryTaxonomyModeCode: modeId,
      });
    }
    return this.getDirectory(user);
  }

  async createUnit(input: CreateUnitInput, user: AuthenticatedUser) {
    const kindId = await this.typeDefs.id("organisation_unit_kind", input.unitKindCode);
    const mode = await this.resolveMode(user.organisationId);

    // BIAN area is optional — required only when mode is bian_aligned AND kind is business_area
    let bianAreaId: string | null = null;
    if (input.bianAreaCode) {
      bianAreaId = await this.typeDefs.id("bian_business_area", input.bianAreaCode);
    } else if (mode.code === "bian_aligned" && input.unitKindCode === "business_area") {
      // Map unit code to area when seeding areas under bian mode
      try {
        bianAreaId = await this.typeDefs.id("bian_business_area", input.code);
      } catch {
        bianAreaId = null;
      }
    }

    if (input.parentId) {
      const parent = await this.db.query.organisationUnits.findFirst({
        where: and(
          eq(organisationUnits.id, input.parentId),
          eq(organisationUnits.organisationId, user.organisationId),
          isNull(organisationUnits.deletedAt),
        ),
      });
      if (!parent) throw new BadRequestException("Parent unit not found in your organisation");
    }

    const code = input.code.trim().toLowerCase().replace(/\s+/g, "_");
    if (!code) throw new BadRequestException("Unit code is required");
    const name = input.name.trim();
    if (!name) throw new BadRequestException("Unit name is required");

    const id = randomUUID();
    const activeStatus = await this.typeDefs.id("organisation_unit_status", "active");

    await this.db.insert(organisationUnits).values({
      id,
      organisationId: user.organisationId,
      siteId: input.siteId ?? null,
      parentId: input.parentId ?? null,
      unitKindCode: kindId,
      bianAreaCode: bianAreaId,
      code,
      name,
      description: input.description?.trim() || null,
      sortOrder: input.sortOrder ?? 0,
    });

    await this.db.insert(organisationUnitStatusEvents).values({
      id: randomUUID(),
      organisationUnitId: id,
      fromStatusCode: null,
      toStatusCode: activeStatus,
      occurredAt: new Date(),
      actorId: user.userId,
      note: "Unit created",
    });

    // Creating a free-form unit under bian_aligned flips to hybrid
    if (mode.code === "bian_aligned" && !input.bianAreaCode && input.unitKindCode !== "business_area") {
      await this.setMode("hybrid", user);
    }
    // Tagging a unit with a BIAN area under custom mode flips to hybrid
    if (mode.code === "custom" && input.bianAreaCode) {
      await this.setMode("hybrid", user);
    }

    return this.getUnit(id, user);
  }

  async updateUnit(
    unitId: string,
    input: Partial<CreateUnitInput> & { archived?: boolean },
    user: AuthenticatedUser,
  ) {
    const found = await this.requireUnit(unitId, user);
    const patch: Partial<typeof organisationUnits.$inferInsert> = {};

    if (input.name !== undefined) patch.name = input.name.trim();
    if (input.description !== undefined) patch.description = input.description?.trim() || null;
    if (input.sortOrder !== undefined) patch.sortOrder = input.sortOrder;
    if (input.siteId !== undefined) patch.siteId = input.siteId;
    if (input.parentId !== undefined) {
      if (input.parentId === unitId) throw new BadRequestException("Unit cannot be its own parent");
      patch.parentId = input.parentId;
    }
    if (input.unitKindCode !== undefined) {
      patch.unitKindCode = await this.typeDefs.id("organisation_unit_kind", input.unitKindCode);
    }
    if (input.bianAreaCode !== undefined) {
      patch.bianAreaCode = input.bianAreaCode
        ? await this.typeDefs.id("bian_business_area", input.bianAreaCode)
        : null;
    }
    if (input.archived) {
      patch.deletedAt = new Date();
      const archived = await this.typeDefs.id("organisation_unit_status", "archived");
      await this.db.insert(organisationUnitStatusEvents).values({
        id: randomUUID(),
        organisationUnitId: unitId,
        fromStatusCode: null,
        toStatusCode: archived,
        occurredAt: new Date(),
        actorId: user.userId,
        note: "Unit archived",
      });
    }

    await this.db
      .update(organisationUnits)
      .set(patch)
      .where(and(eq(organisationUnits.id, unitId), eq(organisationUnits.organisationId, user.organisationId)));

    if (input.archived) {
      return { id: unitId, archived: true };
    }
    return this.getUnit(unitId, user);
  }

  /**
   * Opt-in BIAN Service Landscape starter. Does not wipe custom units.
   * Sets mode to bian_aligned if empty, otherwise hybrid.
   */
  async seedBianTemplate(user: AuthenticatedUser) {
    const existing = await this.db.query.organisationUnits.findMany({
      where: and(eq(organisationUnits.organisationId, user.organisationId), isNull(organisationUnits.deletedAt)),
    });
    const existingCodes = new Set(existing.map((u) => u.code));
    const areaKind = await this.typeDefs.id("organisation_unit_kind", "business_area");
    const domainKind = await this.typeDefs.id("organisation_unit_kind", "business_domain");
    const activeStatus = await this.typeDefs.id("organisation_unit_status", "active");

    for (const area of BIAN_AREA_SEED) {
      let areaId: string;
      if (existingCodes.has(area.code)) {
        areaId = existing.find((u) => u.code === area.code)!.id;
      } else {
        areaId = randomUUID();
        const bianAreaId = await this.typeDefs.id("bian_business_area", area.code);
        await this.db.insert(organisationUnits).values({
          id: areaId,
          organisationId: user.organisationId,
          parentId: null,
          unitKindCode: areaKind,
          bianAreaCode: bianAreaId,
          code: area.code,
          name: area.name,
          description: area.description,
          sortOrder: area.sortOrder,
        });
        await this.db.insert(organisationUnitStatusEvents).values({
          id: randomUUID(),
          organisationUnitId: areaId,
          toStatusCode: activeStatus,
          occurredAt: new Date(),
          actorId: user.userId,
          note: "BIAN template: business area",
        });
        existingCodes.add(area.code);
      }

      for (const domain of area.domains) {
        if (existingCodes.has(domain.code)) continue;
        const domainId = randomUUID();
        const bianAreaId = await this.typeDefs.id("bian_business_area", area.code);
        await this.db.insert(organisationUnits).values({
          id: domainId,
          organisationId: user.organisationId,
          parentId: areaId,
          unitKindCode: domainKind,
          bianAreaCode: bianAreaId,
          code: domain.code,
          name: domain.name,
          description: domain.description,
          sortOrder: domain.sortOrder,
        });
        await this.db.insert(organisationUnitStatusEvents).values({
          id: randomUUID(),
          organisationUnitId: domainId,
          toStatusCode: activeStatus,
          occurredAt: new Date(),
          actorId: user.userId,
          note: "BIAN template: business domain",
        });
        existingCodes.add(domain.code);
      }
    }

    await this.setMode(existing.length > 0 ? "hybrid" : "bian_aligned", user);
    return this.getDirectory(user);
  }

  /**
   * Opt-in flat custom departments — for orgs that do not follow BIAN.
   * Sets mode to custom (or hybrid if BIAN units already exist).
   */
  async seedCustomStarter(user: AuthenticatedUser) {
    const existing = await this.db.query.organisationUnits.findMany({
      where: and(eq(organisationUnits.organisationId, user.organisationId), isNull(organisationUnits.deletedAt)),
    });
    const existingCodes = new Set(existing.map((u) => u.code));
    const deptKind = await this.typeDefs.id("organisation_unit_kind", "department");
    const activeStatus = await this.typeDefs.id("organisation_unit_status", "active");
    const bianAreaIds = new Set(
      (
        await this.db.query.typeDefinition.findMany({
          where: and(eq(typeDefinition.domain, "bian_business_area"), isNull(typeDefinition.deletedAt)),
        })
      ).map((d) => d.id),
    );
    const alreadyHasBianUnits = existing.some((u) => u.bianAreaCode && bianAreaIds.has(u.bianAreaCode));

    for (const dept of CUSTOM_STARTER_DEPARTMENTS) {
      if (existingCodes.has(dept.code)) continue;
      const id = randomUUID();
      await this.db.insert(organisationUnits).values({
        id,
        organisationId: user.organisationId,
        parentId: null,
        unitKindCode: deptKind,
        bianAreaCode: null,
        code: dept.code,
        name: dept.name,
        description: "Custom department (not BIAN-tagged)",
        sortOrder: dept.sortOrder,
      });
      await this.db.insert(organisationUnitStatusEvents).values({
        id: randomUUID(),
        organisationUnitId: id,
        toStatusCode: activeStatus,
        occurredAt: new Date(),
        actorId: user.userId,
        note: "Custom starter department",
      });
    }

    await this.setMode(alreadyHasBianUnits ? "hybrid" : "custom", user);
    return this.getDirectory(user);
  }

  private async getUnit(unitId: string, user: AuthenticatedUser) {
    const row = await this.requireUnit(unitId, user);
    const kind = await this.db.query.typeDefinition.findFirst({ where: eq(typeDefinition.id, row.unitKindCode) });
    const area = row.bianAreaCode
      ? await this.db.query.typeDefinition.findFirst({ where: eq(typeDefinition.id, row.bianAreaCode) })
      : null;
    return {
      id: row.id,
      parentId: row.parentId,
      unitKindCode: kind?.code ?? "department",
      unitKindLabel: kind?.label ?? "Department",
      bianAreaCode: area?.code ?? null,
      bianAreaLabel: area?.label ?? null,
      code: row.code,
      name: row.name,
      description: row.description,
      sortOrder: row.sortOrder,
      siteId: row.siteId,
    };
  }

  private async requireUnit(unitId: string, user: AuthenticatedUser) {
    const found = await this.db.query.organisationUnits.findFirst({
      where: and(
        eq(organisationUnits.id, unitId),
        eq(organisationUnits.organisationId, user.organisationId),
        isNull(organisationUnits.deletedAt),
      ),
    });
    if (!found) throw new NotFoundException("Organisation unit not found");
    return found;
  }

  private async resolveMode(organisationId: string): Promise<{ code: DirectoryModeCode; label: string }> {
    const settings = await this.db.query.organisationSettings.findFirst({
      where: eq(organisationSettings.organisationId, organisationId),
    });
    if (settings?.directoryTaxonomyModeCode) {
      const def = await this.db.query.typeDefinition.findFirst({
        where: eq(typeDefinition.id, settings.directoryTaxonomyModeCode),
      });
      if (def?.code === "bian_aligned" || def?.code === "hybrid" || def?.code === "custom") {
        return { code: def.code, label: def.label };
      }
    }
    return { code: "custom", label: "Custom structure" };
  }

  private async listDomainCodes(domain: string) {
    const rows = await this.db.query.typeDefinition.findMany({
      where: and(eq(typeDefinition.domain, domain), isNull(typeDefinition.deletedAt)),
      orderBy: [asc(typeDefinition.sortOrder)],
    });
    return rows.map((r) => ({ code: r.code, label: r.label }));
  }
}
