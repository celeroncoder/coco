import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    <main className="flex min-h-svh items-center justify-center p-8">
      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        fallbackRedirectUrl="/"
      />
    </main>
  );
}
