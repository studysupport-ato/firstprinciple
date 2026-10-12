import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms and Conditions | Back2Basics with Kwamina",
  description: "Terms governing access to and use of the Back2Basics with Kwamina learning platform.",
};

const sections = [
  {
    title: "1. About these terms",
    paragraphs: [
      "These Terms and Conditions (the “Terms”) govern your access to and use of Back2Basics with Kwamina, including its website, student accounts, course materials, lessons, exercises, assessments, progress features, and related services (together, the “Platform”). In these Terms, “Back2Basics,” “we,” “us,” and “our” refer to the operator of the Platform. “You” means the individual using it.",
      "By creating an account, selecting the agreement checkbox, or otherwise using an account-only feature, you confirm that you have read and agree to these Terms. If you do not agree, do not create an account or use account-only features. The date these Terms were last updated appears above.",
    ],
  },
  {
    title: "2. Who may use the Platform",
    paragraphs: [
      "You may use the Platform only if you can legally enter into an agreement where you live. If you are under the age of legal majority, you may use it only with the involvement and consent of a parent or legal guardian, who is responsible for your use where the law requires.",
      "You must provide accurate information when creating an account and keep it reasonably up to date. Do not create an account for someone else or misrepresent your identity, student status, or affiliation.",
    ],
  },
  {
    title: "3. Your account and security",
    paragraphs: [
      "Some Platform features require an account. You are responsible for keeping your sign-in credentials confidential, using a strong password, and taking reasonable steps to protect your account and devices. You are responsible for activity carried out through your account, except to the extent that applicable law says otherwise.",
      "Notify us through the support channels made available on the Platform as soon as reasonably possible if you believe your account has been accessed without permission, your credentials have been exposed, or your account information is being misused. Do not share an account or transfer it to another person without our written permission.",
      "We may ask you to verify information or take reasonable steps to protect the Platform and its users. We will not ask you to disclose your password through an unsolicited message.",
    ],
  },
  {
    title: "4. Learning services and educational use",
    paragraphs: [
      "The Platform provides educational materials and tools intended to support learning, including mathematics instruction, worked examples, practice questions, course resources, and progress tracking. Content is provided for general educational purposes and is not a substitute for instruction, assessment requirements, professional advice, or the rules of your school or institution.",
      "We do not guarantee a particular grade, qualification, examination result, admission, employment outcome, or level of progress. Learning outcomes depend on many factors, including your own study, the accuracy of information supplied by third parties, and requirements set by your institution.",
      "You remain responsible for checking official course outlines, examination instructions, deadlines, and academic requirements with the relevant institution. If you identify a material error in a learning resource, please report it using the support channels made available on the Platform.",
    ],
  },
  {
    title: "5. Acceptable use",
    paragraphs: [
      "You agree to use the Platform lawfully, respectfully, and for its intended educational purposes. You must not:",
    ],
    bullets: [
      "Use the Platform to break the law, infringe another person’s rights, harass, threaten, deceive, or harm anyone.",
      "Submit or distribute malware, spam, fraudulent material, unlawful content, or content that violates another person’s privacy or intellectual-property rights.",
      "Cheat, impersonate another student, falsify academic activity, manipulate progress or assessment records, or use the Platform to facilitate academic misconduct.",
      "Attempt to gain unauthorised access to an account, system, database, or non-public part of the Platform, or interfere with its security or operation.",
      "Probe, scan, overload, disrupt, reverse engineer, scrape, or harvest data from the Platform, except where applicable law permits an activity that cannot legally be restricted.",
      "Use bots, scripts, or other automated means to access or interact with the Platform in a way that places an unreasonable burden on it or circumvents access controls.",
      "Copy, redistribute, sell, rent, sublicense, or commercially exploit Platform content except as expressly allowed by these Terms or by law.",
    ],
  },
  {
    title: "6. Your content and communications",
    paragraphs: [
      "If the Platform lets you submit questions, feedback, profile information, or other material (“User Content”), you retain any rights you already hold in that material. You give us a limited, non-exclusive, worldwide, royalty-free permission to host, store, reproduce, and use that User Content only as reasonably needed to operate, secure, maintain, and improve the Platform and provide the features you request.",
      "You are responsible for User Content you submit and must have the rights and permissions needed to submit it. Do not submit confidential information, another person’s personal data, or material you are not authorised to share. We may remove or restrict User Content that we reasonably believe violates these Terms, applicable law, or the safety of the Platform.",
      "Feedback and suggestions may be used to improve the Platform without restriction or payment to you, provided we do not publicly identify you without an appropriate basis or permission.",
    ],
  },
  {
    title: "7. Our intellectual property",
    paragraphs: [
      "The Platform and its original materials—including its design, software, text, graphics, branding, course structure, lesson content, and other content—are owned by us or our licensors and are protected by applicable intellectual-property laws. These Terms do not transfer ownership to you.",
      "While you comply with these Terms, we grant you a limited, personal, non-exclusive, non-transferable, revocable licence to access and use the Platform and its materials for your own non-commercial learning. You may not reproduce, publish, distribute, publicly display, adapt, sell, or create derivative works from Platform materials unless we have given permission or the law allows it.",
      "You may share links to publicly available pages. Any permitted quotation or educational use must preserve applicable attribution and must not suggest that we endorse you or your use.",
    ],
  },
  {
    title: "8. Third-party services and materials",
    paragraphs: [
      "The Platform may link to or include services, websites, media, or materials provided by third parties. Those providers may have separate terms and privacy practices. We do not control and are not responsible for third-party services or content; a link or embed does not mean we endorse it. You access third-party services at your own discretion and should review their terms before using them.",
    ],
  },
  {
    title: "9. Availability, changes, and maintenance",
    paragraphs: [
      "We aim to keep the Platform useful and available, but uninterrupted or error-free operation cannot be guaranteed. Features, materials, and availability may change as courses are updated, technical work is carried out, or operational needs arise. We may suspend access temporarily for maintenance, security, legal compliance, or circumstances outside our reasonable control.",
      "We will take reasonable care when making material changes. Where a change significantly affects account use, we will provide notice through the Platform or another reasonable channel when practicable.",
    ],
  },
  {
    title: "10. Fees and payment",
    paragraphs: [
      "If a paid service or feature is offered, its price, billing frequency, included services, and any applicable taxes will be disclosed before you commit to payment. You authorise the payment method you select to be charged for amounts you approve. Do not assume that a service is free or paid unless the relevant offer says so.",
      "Any cancellation, refund, renewal, or access terms specific to a paid offer will be presented with that offer and apply in addition to these Terms. Nothing in these Terms limits a refund or other right that cannot lawfully be excluded.",
    ],
  },
  {
    title: "11. Privacy and personal information",
    paragraphs: [
      "We use account and profile information to create and secure your account, provide learning features, maintain progress, respond to support requests, and operate the Platform. Please do not include sensitive personal information in fields or submissions unless it is necessary and you are authorised to provide it.",
      "Our collection and handling of personal information is subject to applicable data-protection laws and any privacy information presented to you when information is collected. These Terms do not replace a privacy notice or create permission to use personal information for purposes that are not disclosed or otherwise permitted by law.",
    ],
  },
  {
    title: "12. Suspension and termination",
    paragraphs: [
      "You may stop using the Platform at any time. If account deletion or closure is available in your settings, you may use that feature; otherwise contact us through the support channels made available on the Platform.",
      "We may suspend or restrict access, or terminate an account, where reasonably necessary to protect users or the Platform, respond to a serious or repeated breach of these Terms, address suspected fraud or unlawful activity, comply with law, or respond to a security risk. Where appropriate and practicable, we will provide notice and an opportunity to resolve the issue.",
      "On termination, your permission to use account-only features ends. Sections that by their nature should continue—including intellectual property, liability limits, dispute terms, and accrued rights—will remain in effect. We handle account information after closure as required by applicable law and our applicable privacy information.",
    ],
  },
  {
    title: "13. Disclaimers",
    paragraphs: [
      "To the extent permitted by law, the Platform is provided on an “as available” basis. We do not promise that it will always be available, secure, accurate, complete, suitable for every purpose, or free from errors or harmful components. We make no guarantee of a particular educational or other outcome.",
      "Nothing in these Terms excludes a warranty, consumer protection, or other right that applicable law does not allow us to exclude. Where a statutory guarantee applies, these Terms operate subject to that guarantee.",
    ],
  },
  {
    title: "14. Limitation of liability",
    paragraphs: [
      "To the extent permitted by applicable law, we are not liable for indirect, incidental, special, exemplary, or consequential loss, loss of profits, loss of data, loss of opportunity, or interruption arising from your use of or inability to use the Platform. This does not exclude liability where exclusion is prohibited by law, including liability for fraud, wilful misconduct, or personal injury caused by negligence where it cannot legally be limited.",
      "To the extent permitted by law, our total liability for claims arising from the Platform or these Terms will not exceed the amount you paid us for the relevant service in the 12 months before the event giving rise to the claim; if you paid nothing, the limit will be the minimum amount permitted by applicable law. This section does not limit rights or remedies that cannot lawfully be limited.",
    ],
  },
  {
    title: "15. Indemnity",
    paragraphs: [
      "To the extent permitted by law, you are responsible for losses and reasonable costs we incur as a direct result of your unlawful use of the Platform or your material breach of these Terms, including infringement through User Content you submit. We will take reasonable steps to limit avoidable loss. This section does not require you to indemnify us for our own breach, negligence, or other conduct to the extent the law prohibits it.",
    ],
  },
  {
    title: "16. Changes to these Terms",
    paragraphs: [
      "We may update these Terms to reflect changes to the Platform, our practices, or applicable law. We will update the date above and, where a change materially affects your rights or obligations, provide reasonable notice through the Platform or another appropriate channel. Unless a different effective date is stated, updated Terms apply from the date they are posted. If you do not agree to a material update, stop using the affected account features; continued use after the effective date means you accept the updated Terms, subject to any consent required by law.",
    ],
  },
  {
    title: "17. Governing law and disputes",
    paragraphs: [
      "These Terms are governed by the laws of Ghana, without displacing any mandatory consumer or other protections that apply to you under the laws of your place of residence. Before starting formal proceedings, you and we agree to try in good faith to resolve a dispute by contacting one another through the support channels made available on the Platform.",
      "If a dispute cannot be resolved informally, it may be brought before a court with appropriate jurisdiction, subject to mandatory rights and procedures under applicable law. Nothing in this section prevents either party from seeking urgent relief where necessary.",
    ],
  },
  {
    title: "18. General terms",
    paragraphs: [
      "If any part of these Terms is found unenforceable, it will be limited only as much as necessary and the remaining provisions will continue to apply. If we do not enforce a provision immediately, that does not waive our right to enforce it later. You may not transfer your rights or obligations under these Terms without our written consent; we may transfer them as part of a reorganisation or transfer of the Platform, provided your legal rights are not reduced.",
      "These Terms, together with any terms expressly presented for a particular feature or paid offer, form the agreement between you and us about the Platform. If a feature-specific term conflicts with these Terms, the feature-specific term applies only to that feature. These Terms do not create an employment, agency, partnership, or joint-venture relationship.",
    ],
  },
  {
    title: "19. Contact",
    paragraphs: [
      "For questions about these Terms, account access, or a concern about use of the Platform, contact us through the support or contact channels made available on the Platform.",
    ],
  },
];

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#F7F7F4] px-4 py-10 text-[#111111] sm:px-6 sm:py-16">
      <article className="mx-auto max-w-4xl rounded-[28px] border border-[#E5E5E5] bg-white px-6 py-8 shadow-[0_24px_60px_rgba(17,17,17,0.04)] sm:px-12 sm:py-12">
        <Link href="/" className="text-sm font-semibold text-[#555555] underline-offset-4 hover:text-[#111111] hover:underline">
          Back2Basics with Kwamina
        </Link>
        <header className="mt-8 border-b border-[#E5E5E5] pb-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#777777]">Legal</p>
          <h1 className="mt-3 font-serif text-4xl leading-tight sm:text-5xl">Terms and Conditions</h1>
          <p className="mt-4 text-sm text-[#666666]">Last updated: October 8, 2026</p>
          <p className="mt-5 max-w-3xl text-base leading-7 text-[#555555]">
            These Terms explain the rules for creating an account and using our learning platform, including your responsibilities, our services, and how disputes are handled. Please read them before you sign up.
          </p>
        </header>

        <div className="divide-y divide-[#EEEEEC]">
          {sections.map((section) => (
            <section key={section.title} className="py-7">
              <h2 className="font-serif text-2xl">{section.title}</h2>
              <div className="mt-3 space-y-4 text-[15px] leading-7 text-[#444444]">
                {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                {section.bullets ? (
                  <ul className="list-disc space-y-2 pl-6">
                    {section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
                  </ul>
                ) : null}
              </div>
            </section>
          ))}
        </div>

        <footer className="border-t border-[#E5E5E5] pt-6 text-sm text-[#666666]">
          Please keep a copy of these Terms for your records. If you have questions, use the support channels available on the Platform.
        </footer>
      </article>
    </main>
  );
}
