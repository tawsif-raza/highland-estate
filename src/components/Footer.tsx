import Link from "next/link";

const CONNECT_LINKS = [
  {
    label: "GitHub",
    value: "github.com/tawsif-raza",
    href: "https://github.com/tawsif-raza",
  },
  {
    label: "LinkedIn",
    value: "linkedin.com/in/tawsif-khan-34952336b",
    href: "https://www.linkedin.com/in/tawsif-khan-34952336b/",
  },
  {
    label: "Email",
    value: "tawsifk35@gmail.com",
    href: "mailto:tawsifk35@gmail.com",
  },
  {
    label: "Phone",
    value: "+91 9337233601",
    href: "tel:+919337233601",
  },
];

export default function Footer() {
  return (
    <footer id="contact" className="bg-dark-accent py-16 text-accent">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
          <div>
            <p className="font-lora text-2xl">THE HIGHLAND ESTATE</p>
            <p className="mt-3 text-sm text-accent/70">
              Elevated living in the canopy.
            </p>
          </div>

          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-accent/50">
              Developed By
            </p>
            <p className="mt-4 text-sm leading-relaxed text-accent/80">
              Built by a Python Developer specializing in Next.js and machine
              learning architectures. Creator of predictive models including
              house price prediction and email spam classifiers.
            </p>
          </div>

          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-accent/50">
              Let&apos;s Connect
            </p>
            <ul className="mt-4 flex flex-col gap-3">
              {CONNECT_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    target={link.href.startsWith("http") ? "_blank" : undefined}
                    rel={
                      link.href.startsWith("http")
                        ? "noopener noreferrer"
                        : undefined
                    }
                    className="text-sm text-accent/80 transition-colors hover:text-accent"
                  >
                    {link.label}: {link.value}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-gray-600/50 pt-8">
          <p className="text-center text-sm text-accent/60">
            © 2026 The Highland Estate. A frontend and UI/UX portfolio
            showcase.
          </p>
        </div>
      </div>
    </footer>
  );
}
