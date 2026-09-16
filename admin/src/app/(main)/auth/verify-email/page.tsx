import type { Metadata } from "next";
import { Suspense } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { authCopy } from "@/lib/copy/auth";

import { AuthCardHeader, AuthLayout } from "../_components/auth-layout";
import { VerifyEmailClient } from "../_components/verify-email-client";

export const metadata: Metadata = {
  title: "Verify email · Buffr Checkpoint",
};

export default function VerifyEmailPage() {
  return (
    <AuthLayout>
      <Card className="w-full max-w-sm">
        <AuthCardHeader title={authCopy.verifyEmail.title} description={authCopy.verifyEmail.successDescription} />
        <CardContent>
          <Suspense fallback={<p className="text-muted-foreground text-sm">{authCopy.verifyEmail.title}</p>}>
            <VerifyEmailClient />
          </Suspense>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
