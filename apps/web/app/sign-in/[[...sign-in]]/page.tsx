import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <main className="flex min-h-svh items-center justify-center p-8">
      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        fallbackRedirectUrl="/"
      />
    </main>
  );
}
