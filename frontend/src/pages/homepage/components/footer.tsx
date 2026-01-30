"use client";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Logo } from "@/components/ui/shadcn-io/navbar-01";
import { GitHubIcon, LinkedInIcon } from "@daveyplate/better-auth-ui";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const newsletterSchema = z.object({
  email: z.email({
    message: "Please enter a valid email address.",
  }),
});

const footerLinks = {
  links: [
    { name: "Website", href: "https://sciencelive4all.org/" },
    { name: "GitHub", href: "https://github.com/ScienceLiveHub" },
    { name: "Nanopublications", href: "http://nanopub.org/" },
  ],
  contact: [
    { name: "Email", href: "mailt:contact@sciencelive4all.org" },
    { name: "Book a Call", href: "https://calendly.com/anne-fouilloux/30min" },
    { name: "LinkedIn", href: "https://www.linkedin.com/company/sciencelive" },
  ],
};

const socialLinks = [
  {
    name: "GitHub",
    href: "https://github.com/ScienceLiveHub",
    icon: GitHubIcon,
  },
  {
    name: "LinkedIn",
    href: "https://www.linkedin.com/company/sciencelive",
    icon: LinkedInIcon,
  },
  {
    name: "Email",
    href: "mailt:contact@sciencelive4all.org",
    icon: Mail,
  },
];

export function LandingFooter() {
  const form = useForm<z.infer<typeof newsletterSchema>>({
    resolver: zodResolver(newsletterSchema),
    defaultValues: {
      email: "",
    },
  });

  function onSubmit(values: z.infer<typeof newsletterSchema>) {
    // Here you would typically send the email to your newsletter service
    console.log(values);
    // Show success message and reset form
    form.reset();
  }

  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Newsletter Section */}
        <div className="mb-16">
          <div className="mx-auto max-w-2xl text-center">
            <h3 className="text-2xl font-bold mb-4">Stay updated</h3>
            <p className="text-muted-foreground mb-6">
              Get the latest updates, articles, and resources sent to your inbox
              weekly.
            </p>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="flex flex-col gap-2 max-w-md mx-auto sm:flex-row"
              >
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="Enter your email"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="cursor-pointer">
                  Subscribe
                </Button>
              </form>
            </Form>
          </div>
        </div>
        {/* Main Footer Content */}
        <div className="grid gap-8 grid-cols-4 lg:grid-cols-4">
          {/* Brand Column */}
          <div className="col-span-4 lg:col-span-2 max-w-2xl">
            <div className="flex items-center space-x-2 mb-4 max-lg:justify-center">
              <a
                href="https://sciencelive4all.org/"
                target="_blank"
                className="flex items-center space-x-2 cursor-pointer"
              >
                <Logo />
                <span className="font-bold text-xl">Science Live</span>
              </a>
            </div>
            <p className="text-muted-foreground mb-6 max-lg:text-center max-lg:flex max-lg:justify-center">
              Making research FAIR and connected.
            </p>
            <div className="flex space-x-4 max-lg:justify-center">
              {socialLinks.map((social) => (
                <Button key={social.name} variant="ghost" size="icon" asChild>
                  <a
                    href={social.href}
                    aria-label={social.name}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <social.icon className="h-4 w-4 saturate-0" />
                  </a>
                </Button>
              ))}
            </div>
          </div>

          {/* Links Columns */}
          <div className="max-md:col-span-2 lg:col-span-1">
            <h4 className="font-semibold mb-4">Links</h4>
            <ul className="space-y-3">
              {footerLinks.links.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="max-md:col-span-2 lg:col-span-1">
            <h4 className="font-semibold mb-4">Contact</h4>
            <ul className="space-y-3">
              {footerLinks.contact.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <Separator className="my-8" />
        {/* Bottom Footer */}
        <div className="flex flex-col lg:flex-row justify-between items-center gap-2">
          <div className="flex flex-col sm:flex-row items-center gap-2 text-muted-foreground text-sm">
            <span>© {new Date().getFullYear()} Science Live Platform</span>
            <span className="hidden sm:inline">•</span>
            v0.1.0 (Development)
          </div>
          <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-4 md:mt-0">
            <a
              href="#privacy"
              className="hover:text-foreground transition-colors"
            >
              Privacy Policy
            </a>
            <a
              href="#terms"
              className="hover:text-foreground transition-colors"
            >
              Terms of Service
            </a>
            <a
              href="#cookies"
              className="hover:text-foreground transition-colors"
            >
              Cookie Policy
            </a>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-2 text-muted-foreground text-sm pt-1">
          Supported by the Astera Institute
        </div>
      </div>
    </footer>
  );
}
