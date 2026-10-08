// What Checkpoint does about data protection so the organisation does not have to: the product's main promise (buffrcheckpoint.md 1.5). Every
// item is something the product does and can show in the evidence pack. The legal roles (controller and processor) are in the Terms and
// the Privacy Policy, stated once where a contract needs them. Nothing here says "compliant" or "certified".

export const PRIVACY_MANAGED = {
  eyebrow: "Privacy, handled",
  title: "The data protection work is done for you.",
  lead: "Most organisations have no one whose job is privacy. Checkpoint does the work from the first day, so a visitor's details are protected whether or not anyone on your team thinks about it.",
  items: [
    {
      title: "A privacy notice, written for you",
      body: "Every organisation starts with a visitor privacy notice in its own name: what is collected, why, how long it is kept, and who to ask. You can edit it if you want to.",
    },
    {
      title: "A retention period from day one",
      body: "A retention period applies from the first day, and a legal hold always wins over it. Queued emails and texts have their addresses, numbers and wording cleared 30 days after delivery.",
    },
    {
      title: "Data requests on the clock",
      body: "When a visitor asks for a copy, a correction or a deletion, the request gets its one-month deadline automatically. Your compliance officer sees what is due and what is late.",
    },
    {
      title: "An answer for your auditor",
      body: "When an auditor asks who saw a record, how long it is kept, or which providers hold the data, you export one evidence pack: the retention in force, legal holds, data requests with their dates, and every provider with where it runs.",
    },
    {
      title: "If something goes wrong",
      body: "A breach notice is already written. We tell you what happened, what it affects and what we are doing about it.",
    },
  ],
  close: "You decide who can see what, and when a legal hold applies. The rest is built in.",
} as const;
