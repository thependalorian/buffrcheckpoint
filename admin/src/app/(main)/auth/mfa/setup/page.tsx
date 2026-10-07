import type { Metadata } from "next";

import { Card, CardContent } from "@/components/ui/card";
import { authCopy } from "@/lib/copy/auth";

import { AuthCardHeader, AuthLayout } from "../../_components/auth-layout";
import { MfaSetupGate } from "../../_components/mfa-setup-gate";

export const metadata: Metadata = {
  title: "Set up MFA · Checkpoint",
};

export default function MfaSetupPage() {
  return (
    <AuthLayout>
      <Card className="w-full max-w-sm">
        <AuthCardHeader title={authCopy.mfaSetup.title} description={authCopy.mfaSetup.description} />
        <CardContent>
          <MfaSetupGate />
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
