import { NativeSelect } from "@/components/ui/native-select";

export type OrgOption = { id: string; label: string };

/** Native org picker — prefer this over raw UUID text fields. */
export function OrgSelect({
  name = "organisationId",
  orgs,
  required,
  optionalLabel = "No linked organisation",
  allowEmpty = true,
  className,
  id,
  defaultValue,
}: {
  name?: string;
  orgs: OrgOption[];
  required?: boolean;
  optionalLabel?: string;
  allowEmpty?: boolean;
  className?: string;
  id?: string;
  defaultValue?: string;
}) {
  return (
    <NativeSelect
      id={id}
      name={name}
      required={required && !allowEmpty}
      className={className}
      defaultValue={defaultValue ?? ""}
    >
      {allowEmpty ? <option value="">{optionalLabel}</option> : null}
      {orgs.map((org) => (
        <option key={org.id} value={org.id}>
          {org.label}
        </option>
      ))}
    </NativeSelect>
  );
}
