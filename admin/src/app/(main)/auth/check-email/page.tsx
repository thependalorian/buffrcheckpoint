import type { Metadata } from "next";
import { Suspense } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { authCopy } from "@/lib/copy/auth";

import { AuthCardHeader, AuthLayout } from "../_components/auth-layout";
import { CheckEmailForm } from "../_components/check-email-form";

export const metadata: Metadata = {
  title: "Check your email · Buffr Checkpoint",
};

export default function CheckEmailPage() {
  return (
    <AuthLayout>
      <Card className="w-full max-w-sm">
        <AuthCardHeader title={authCopy.checkEmail.title} description={authCopy.checkEmail.description} />
        <CardContent>
          <Suspense fallback={<p className="text-muted-foreground text-sm">Loading...</p>}>
            <CheckEmailForm />
          </Suspense>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
