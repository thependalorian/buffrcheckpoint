"use client";

import { useState } from "react";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiBaseUrl } from "@/lib/api";
import { AnalyticsEvents, track } from "@/lib/observability/track";

type FormState = "idle" | "loading" | "success" | "error";

export function ContactForm() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    organisation: "",
    siteType: "",
    message: "",
    website: "",
  });
  const [formState, setFormState] = useState<FormState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormState("loading");
    setErrorMessage(null);

    try {
      const response = await fetch(`${apiBaseUrl()}/public/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          company: [formData.organisation, formData.siteType].filter(Boolean).join(" / ") || undefined,
          message: formData.message,
          website: formData.website,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(typeof body.message === "string" ? body.message : "Could not send enquiry");
      }

      setFormState("success");
      track(AnalyticsEvents.contactEnquirySubmitted, { has_site_type: Boolean(formData.siteType) });
      toast.success("Thank you for your enquiry. We will be in touch within one business day.");
      setFormData({ name: "", email: "", organisation: "", siteType: "", message: "", website: "" });
    } catch (err) {
      setFormState("error");
      const message = err instanceof Error ? err.message : "Could not send enquiry";
      setErrorMessage(message);
      toast.error(message);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const isSubmitting = formState === "loading";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" name="name" value={formData.name} onChange={handleChange} required disabled={isSubmitting} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Work email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            required
            disabled={isSubmitting}
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="organisation">Organisation</Label>
          <Input
            id="organisation"
            name="organisation"
            value={formData.organisation}
            onChange={handleChange}
            required
            disabled={isSubmitting}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="siteType">Site type</Label>
          <select
            id="siteType"
            name="siteType"
            value={formData.siteType}
            onChange={handleChange}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            required
            disabled={isSubmitting}
          >
            <option value="">Select a site type</option>
            <option value="bank">Bank / Financial institution</option>
            <option value="government">Government / Public office</option>
            <option value="healthcare">Healthcare facility</option>
            <option value="critical">Critical infrastructure / Mining / Logistics</option>
            <option value="corporate">Multi-site corporate / SME</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="message">How can we help?</Label>
        <Textarea
          id="message"
          name="message"
          value={formData.message}
          onChange={handleChange}
          rows={5}
          placeholder="Tell us about your current visitor process, your site count, and what you would like to improve..."
          required
          disabled={isSubmitting}
        />
      </div>
      {/* Honeypot — leave empty; bots that fill it are rejected server-side */}
      <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
        <Label htmlFor="website">Website</Label>
        <Input
          id="website"
          name="website"
          value={formData.website}
          onChange={handleChange}
          tabIndex={-1}
          autoComplete="off"
        />
      </div>
      {formState === "error" && errorMessage ? <p className="text-destructive text-sm">{errorMessage}</p> : null}
      {formState === "success" ? (
        <p className="text-sm text-green-700 dark:text-green-400">Enquiry received. We will reply within one business day.</p>
      ) : null}
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Sending..." : "Send Enquiry"}
      </Button>
    </form>
  );
}
