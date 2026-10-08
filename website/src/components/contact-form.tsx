"use client";

import { type FormEvent, useState } from "react";

import { TurnstileWidget, turnstileEnabled } from "@/components/turnstile-widget";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiBaseUrl } from "@/lib/api";
import { CONTACT_EMAIL_TOPICS, CONTACT_FORM, PUBLIC_CONTACT_EMAIL } from "@/lib/copy/contact";

type State = { kind: "idle" } | { kind: "sending" } | { kind: "sent" } | { kind: "error"; message: string };

/** Posts to the API's public contact route: a honeypot field, a throttle, a durable record and an acknowledgement by email. */
export function ContactForm() {
  const [topic, setTopic] = useState<string>(CONTACT_EMAIL_TOPICS[1].subject);
  const [message, setMessage] = useState<string>(CONTACT_EMAIL_TOPICS[1].prompt);
  const [state, setState] = useState<State>({ kind: "idle" });
  const [token, setToken] = useState<string | null>(null);
  const [resetSignal, setResetSignal] = useState(0);

  function chooseTopic(subject: string) {
    const previous = CONTACT_EMAIL_TOPICS.find((t) => t.subject === topic);
    const next = CONTACT_EMAIL_TOPICS.find((t) => t.subject === subject);
    setTopic(subject);
    // Replace the prompts only while they are still the untouched prompts of the previous topic.
    if (next && (message.trim() === "" || message === previous?.prompt)) setMessage(next.prompt);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setState({ kind: "sending" });
    setResetSignal((n) => n + 1);
    try {
      const response = await fetch(`${apiBaseUrl()}/public/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { "x-turnstile-token": token } : {}) },
        body: JSON.stringify({
          name: String(form.get("name") ?? ""),
          email: String(form.get("email") ?? ""),
          company: String(form.get("company") ?? "") || undefined,
          message: `Topic: ${topic}\n\n${message}`,
          website: String(form.get("website") ?? ""),
        }),
      });
      if (response.ok) return setState({ kind: "sent" });
      if (response.status === 429) return setState({ kind: "error", message: CONTACT_FORM.tooMany });
      if (response.status === 400) return setState({ kind: "error", message: CONTACT_FORM.invalid });
      setState({ kind: "error", message: `${CONTACT_FORM.failed} ${PUBLIC_CONTACT_EMAIL}.` });
    } catch {
      setState({ kind: "error", message: `${CONTACT_FORM.failed} ${PUBLIC_CONTACT_EMAIL}.` });
    }
  }

  if (state.kind === "sent") {
    return (
      <p role="status" className="border-l-2 border-[var(--color-sodium-yellow)] py-2 pl-4 text-sm text-foreground">
        {CONTACT_FORM.success}
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <h2 className="font-heading text-lg font-medium text-foreground">{CONTACT_FORM.heading}</h2>
      <div className="space-y-1.5">
        <Label htmlFor="topic">{CONTACT_FORM.topicLabel}</Label>
        <select
          id="topic"
          value={topic}
          onChange={(e) => chooseTopic(e.target.value)}
          className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
        >
          {CONTACT_EMAIL_TOPICS.map((t) => (
            <option key={t.subject} value={t.subject}>
              {t.title}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name">{CONTACT_FORM.nameLabel}</Label>
          <Input id="name" name="name" autoComplete="name" required maxLength={200} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">{CONTACT_FORM.emailLabel}</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required maxLength={200} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="company">{CONTACT_FORM.companyLabel}</Label>
        <Input id="company" name="company" autoComplete="organization" maxLength={200} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="message">{CONTACT_FORM.messageLabel}</Label>
        <Textarea
          id="message"
          rows={8}
          required
          maxLength={4800}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <p className="text-muted-foreground text-xs">{CONTACT_FORM.messageHelp}</p>
      </div>
      {/* Honeypot: people never see or fill this; a bot that fills every field is dropped by the API. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <TurnstileWidget onToken={setToken} resetSignal={resetSignal} />
      <Button type="submit" disabled={state.kind === "sending" || (turnstileEnabled && !token)}>
        {state.kind === "sending" ? CONTACT_FORM.sending : CONTACT_FORM.submit}
      </Button>
      {state.kind === "error" ? (
        <p role="alert" className="text-destructive text-sm">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
