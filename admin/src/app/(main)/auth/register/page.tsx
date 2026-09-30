import type { Metadata } from "next";

import { Card, CardContent } from "@/components/ui/card";

import { AuthCardHeader, AuthLayout } from "../_components/auth-layout";
import { RegisterForm } from "../_components/register-form";

export const metadata: Metadata = {
  title: "Create account: Checkpoint",
};

export default function RegisterPage() {
  return (
    <AuthLayout>
      <Card className="w-full max-w-sm">
        {/* Section 9.1a: first account on a new organisation is provisioned as Owner-Operator */}
        <AuthCardHeader
          title="Create your organisation"
          description="Start with a verified Owner-Operator account. You will confirm your email before signing in."
        />
        <CardContent>
          <RegisterForm />
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
