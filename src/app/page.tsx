import { LoginForm } from '@/components/login-form';

export default function LoginPage() {
  return (
    <main className="flex min-h-screen w-full items-center justify-center">
      <div className="w-full max-w-md p-4">
        <LoginForm />
      </div>
    </main>
  );
}
