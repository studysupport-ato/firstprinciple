import Link from "next/link";

export default function AuthErrorPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FBFAF9] px-6 py-12">
      <section className="w-full max-w-lg rounded-3xl border border-[#E5E5E5] bg-white p-8 text-center shadow-sm">
        <h1 className="font-serif text-3xl text-[#111111]">Google sign-in could not be completed</h1>
        <p className="mt-4 text-sm leading-6 text-[#666666]">
          If you already have a student account, sign in with its existing method first,
          then link Google from Settings. If this keeps happening, contact support.
        </p>
        <Link
          href="/courses?auth=required"
          className="mt-7 inline-flex min-h-11 items-center justify-center rounded-full bg-[#111111] px-6 text-sm font-semibold text-white transition hover:bg-[#333333]"
        >
          Return to sign in
        </Link>
      </section>
    </main>
  );
}
