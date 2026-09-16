-- Buffr Checkpoint — organisation directory + visitor wait queue
-- Tenant-populated organisation_units tree. Orgs may use a free-form custom
-- structure, an optional BIAN Service Landscape template (Business Area →
-- Business Domain → Service Domain / department), or a hybrid of both.
-- bian_area_code is optional taxonomy — never required for custom trees.
-- Hosts optionally link to a unit. Reception wait queue tracks visitors after
-- check-in (distinct from kiosk offline sync outbox).
--
-- Wiebe: UUID PKs, organisation_id tenancy, soft deletes, type_definition FKs,
-- status event companions, zero triggers, zero ON DELETE CASCADE.

-- Directory mode on organisation_settings (custom | bian_aligned | hybrid)
ALTER TABLE organisation_settings
  ADD COLUMN IF NOT EXISTS directory_taxonomy_mode_code UUID NULL
    REFERENCES type_definition (id);

-- ============================================================================
-- organisation_units (BIAN-shaped org directory)
-- ============================================================================

CREATE TABLE organisation_units (
  id                 UUID PRIMARY KEY,
  organisation_id    UUID NOT NULL REFERENCES organisations (id),
  site_id            UUID NULL REFERENCES sites (id),
  parent_id          UUID NULL REFERENCES organisation_units (id),
  unit_kind_code     UUID NOT NULL REFERENCES type_definition (id),
  bian_area_code     UUID NULL REFERENCES type_definition (id),
  code               TEXT NOT NULL,
  name               TEXT NOT NULL,
  description        TEXT NULL,
  sort_order         INT NOT NULL DEFAULT 0,
  deleted_at         TIMESTAMPTZ NULL
);

CREATE INDEX idx_organisation_units_org
  ON organisation_units (organisation_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_organisation_units_org_parent
  ON organisation_units (organisation_id, parent_id)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX idx_organisation_units_org_code
  ON organisation_units (organisation_id, code)
  WHERE deleted_at IS NULL;

CREATE TABLE organisation_unit_status_events (
  id                     UUID PRIMARY KEY,
  organisation_unit_id   UUID NOT NULL REFERENCES organisation_units (id),
  from_status_code       UUID NULL REFERENCES type_definition (id),
  to_status_code         UUID NOT NULL REFERENCES type_definition (id),
  occurred_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_id               UUID NULL,
  note                   TEXT NULL
);

CREATE INDEX idx_organisation_unit_status_events_unit
  ON organisation_unit_status_events (organisation_unit_id, occurred_at);

-- ============================================================================
-- Link hosts to directory units (department text remains denormalized label)
-- ============================================================================

ALTER TABLE site_hosts
  ADD COLUMN IF NOT EXISTS organisation_unit_id UUID NULL
    REFERENCES organisation_units (id);

CREATE INDEX IF NOT EXISTS idx_site_hosts_org_unit
  ON site_hosts (organisation_id, organisation_unit_id)
  WHERE deleted_at IS NULL AND organisation_unit_id IS NOT NULL;

-- ============================================================================
-- Visitor wait queue (reception) — distinct from kiosk offline sync outbox
-- ============================================================================

CREATE TABLE visitor_wait_queue_entries (
  id                     UUID PRIMARY KEY,
  organisation_id        UUID NOT NULL REFERENCES organisations (id),
  site_id                UUID NOT NULL REFERENCES sites (id),
  visit_id               UUID NOT NULL REFERENCES visitor_visits (id),
  host_id                UUID NOT NULL REFERENCES site_hosts (id),
  organisation_unit_id   UUID NULL REFERENCES organisation_units (id),
  queue_number           INT NOT NULL,
  position_at_enqueue    INT NOT NULL,
  status_code            UUID NOT NULL REFERENCES type_definition (id),
  enqueued_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  called_at              TIMESTAMPTZ NULL,
  completed_at           TIMESTAMPTZ NULL,
  deleted_at             TIMESTAMPTZ NULL
);

CREATE UNIQUE INDEX idx_visitor_wait_queue_visit
  ON visitor_wait_queue_entries (visit_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_visitor_wait_queue_org_site_status
  ON visitor_wait_queue_entries (organisation_id, site_id, status_code, enqueued_at)
  WHERE deleted_at IS NULL;

CREATE TABLE visitor_wait_queue_entry_status_events (
  id                 UUID PRIMARY KEY,
  queue_entry_id     UUID NOT NULL REFERENCES visitor_wait_queue_entries (id),
  from_status_code   UUID NULL REFERENCES type_definition (id),
  to_status_code     UUID NOT NULL REFERENCES type_definition (id),
  occurred_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_id           UUID NULL
);

CREATE INDEX idx_visitor_wait_queue_entry_status_events_entry
  ON visitor_wait_queue_entry_status_events (queue_entry_id, occurred_at);
