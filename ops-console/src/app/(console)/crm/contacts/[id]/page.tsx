import Link from "next/link";

import { DashboardErrorState } from "@/components/dashboard-state";
import { apiFetch, loadOrError } from "@/lib/api";
import { loadOrgLabelMap } from "@/lib/orgs";

import { ContactEditForm } from "./_components/contact-edit-form";

interface Contact {
  id: string;
  organisationId: string;
  name: string;
  email: string | null;
  phone: string | null;
  roleTitle: string | null;
  isPrimary: boolean;
}

export default async function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const result = await loadOrError(async () => {
    const [contact, orgLabel] = await Promise.all([
      apiFetch<Contact>(`/platform/crm/contacts/${id}`),
      loadOrgLabelMap(),
    ]);
    return { contact, orgLabel };
  });

  if (result.error || !result.data) {
    return (
      <div className="space-y-4">
        <h1 className="font-heading font-light text-2xl">Contact</h1>
        <DashboardErrorState message={result.error ?? "API error 500"} />
      </div>
    );
  }

  const { contact, orgLabel } = result.data;

  return (
    <div>
      <Link
        href={`/organisations/${contact.organisationId}?tab=crm`}
        className="text-slate text-xs hover:text-foreground"
      >
        ← {orgLabel[contact.organisationId] ?? "Organisation"} CRM
      </Link>
      <h1 className="mt-2 font-heading font-light text-2xl text-foreground">{contact.name}</h1>
      <p className="mt-1 text-muted-foreground text-sm">
        Edit role, email, or phone. Changes are logged on the organisation activity feed.
      </p>
      <ContactEditForm
        contactId={contact.id}
        initial={{
          name: contact.name,
          email: contact.email,
          phone: contact.phone,
          roleTitle: contact.roleTitle,
          isPrimary: contact.isPrimary,
        }}
      />
    </div>
  );
}
