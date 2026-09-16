import { redirect } from "next/navigation";

// This route predates /dashboard/account (the one linked from the sidebar,
// see navigation/sidebar/sidebar-items.ts) and duplicated the same "My
// Account" view with a broken JSX self-closing tag and an empty
// _components/profile-data.ts backing it — never fixed because the route
// was never linked. Consolidated to the one real implementation rather
// than maintaining two.
export default function ProfilePage() {
  redirect("/dashboard/account");
}
