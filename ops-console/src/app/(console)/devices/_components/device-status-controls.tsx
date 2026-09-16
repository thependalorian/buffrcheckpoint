"use client";

import { StatusSelect } from "@/components/ui/status-select";

import { updateDeviceCranStatusAction } from "../actions";

// cran_compliance_status codes, in the order seeded by
// backend/db/seed/0001_type_definitions.sql. Section 14.3a's gate only lets an
// approved_for_deployment device activate, so this select is what opens or
// closes that gate.
const CRAN_STATUSES = [
  "unassessed",
  "supplier_evidence_received",
  "exemption_assessed",
  "cran_certificate_confirmed",
  "mdm_enrolled",
  "approved_for_deployment",
  "retired",
];

export function DeviceStatusControls({ deviceId, organisationId }: { deviceId: string; organisationId: string }) {
  return (
    <StatusSelect
      options={CRAN_STATUSES.map((s) => ({ value: s, label: s.replaceAll("_", " ") }))}
      placeholder="Change CRAN status…"
      onChange={(next) => updateDeviceCranStatusAction(deviceId, organisationId, next)}
    />
  );
}
