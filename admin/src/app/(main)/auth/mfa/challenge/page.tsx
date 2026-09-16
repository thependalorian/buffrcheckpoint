import type { Metadata } from "next";

import { Card, CardContent } from "@/components/ui/card";
import { authCopy } from "@/lib/copy/auth";

import { AuthCardHeader, AuthLayout } from "../../_components/auth-layout";
import { MfaChallengeForm } from "../../_components/mfa-challenge-form";

export const metadata: Metadata = {
  title: "Authenticator check · Buffr Checkpoint",
};

export default function MfaChallengePage() {
  return (
    <AuthLayout>
      <Card className="w-full max-w-sm">
        <AuthCardHeader title={authCopy.mfaChallenge.title} description={authCopy.mfaChallenge.description} />
        <CardContent>
          <MfaChallengeForm />
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
