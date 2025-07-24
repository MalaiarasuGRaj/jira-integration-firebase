import { LoginForm } from '@/components/login-form';
import { LinkIcon } from 'lucide-react';

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center items-center mb-6">
          <LinkIcon className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold ml-2 tracking-tight">JiraLink</h1>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
