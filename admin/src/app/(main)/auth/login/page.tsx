import type { Metadata } from "next";
import { Suspense } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { authCopy } from "@/lib/copy/auth";

import { AuthCardHeader, AuthLayout } from "../_components/auth-layout";
import { LoginForm } from "../_components/login-form";

export const metadata: Metadata = {
  title: "Sign in: Buffr Checkpoint",
};

export default function LoginPage() {
  return (
    <AuthLayout>
      <Card className="w-full max-w-sm">
        <AuthCardHeader title={authCopy.login.title} description={authCopy.login.description} />
        <CardContent>
          <Suspense fallback={<p className="text-muted-foreground text-sm">Loading...</p>}>
            <LoginForm />
          </Suspense>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
