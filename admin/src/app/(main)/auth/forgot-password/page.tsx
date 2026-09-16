import type { Metadata } from "next";

import { Card, CardContent } from "@/components/ui/card";
import { authCopy } from "@/lib/copy/auth";

import { AuthCardHeader, AuthLayout } from "../_components/auth-layout";
import { ForgotPasswordForm } from "../_components/forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot password: Buffr Checkpoint",
};

export default function ForgotPasswordPage() {
  return (
    <AuthLayout>
      <Card className="w-full max-w-sm">
        <AuthCardHeader title={authCopy.forgotPassword.title} description={authCopy.forgotPassword.description} />
        <CardContent>
          <ForgotPasswordForm />
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
