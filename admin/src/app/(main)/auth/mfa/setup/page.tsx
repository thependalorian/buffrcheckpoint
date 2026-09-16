import type { Metadata } from "next";

import { Card, CardContent } from "@/components/ui/card";
import { authCopy } from "@/lib/copy/auth";

import { AuthCardHeader, AuthLayout } from "../../_components/auth-layout";
import { MfaSetupForm } from "../../_components/mfa-setup-form";

export const metadata: Metadata = {
  title: "Set up MFA · Buffr Checkpoint",
};

export default function MfaSetupPage() {
  return (
    <AuthLayout>
      <Card className="w-full max-w-sm">
        <AuthCardHeader title={authCopy.mfaSetup.title} description={authCopy.mfaSetup.description} />
        <CardContent>
          <MfaSetupForm />
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
