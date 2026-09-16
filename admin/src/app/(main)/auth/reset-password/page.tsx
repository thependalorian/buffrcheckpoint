import type { Metadata } from "next";
import { Suspense } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { authCopy } from "@/lib/copy/auth";

import { AuthCardHeader, AuthLayout } from "../_components/auth-layout";
import { ResetPasswordForm } from "../_components/reset-password-form";

export const metadata: Metadata = {
  title: "Reset password: Buffr Checkpoint",
};

export default function ResetPasswordPage() {
  return (
    <AuthLayout>
      <Card className="w-full max-w-sm">
        <AuthCardHeader title={authCopy.resetPassword.title} description={authCopy.resetPassword.description} />
        <CardContent>
          <Suspense fallback={<p className="text-muted-foreground text-sm">Loading...</p>}>
            <ResetPasswordForm />
          </Suspense>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
