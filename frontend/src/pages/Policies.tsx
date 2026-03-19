// Markdown is pre-compiled to React components at build time by plugin in vite.config.ts
import PolicyContent from "../../../docs/policy/policies.md";
import PrivacyContent from "../../../docs/policy/privacy.md";
import TermsContent from "../../../docs/policy/terms.md";

export default function Policies() {
  return (
    <main className="container mx-auto flex grow flex-col gap-3 self-center p-8 md:p-6 md:max-w-260">
      <article className="prose max-w-none">
        <i>This page includes:</i>
        <ul>
          <li>
            <a href="#terms">Terms of Service</a>
          </li>
          <li>
            <a href="#privacy">Privacy Policy</a>
          </li>
          <li>
            <a href="#datapolicy">Data & API Policy</a>
          </li>
        </ul>
        <h1 className="mt-10 mb-10" id="terms">
          Terms of Service
        </h1>
        <TermsContent />
        <h1 className="mt-30 mb-10" id="privacy">
          Privacy Policy
        </h1>
        <PrivacyContent />
        <h1 className="mt-30 mb-10" id="datapolicy">
          Data & API Policy
        </h1>
        <PolicyContent />
      </article>
    </main>
  );
}
