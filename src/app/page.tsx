import { LoginForm } from '@/components/login-form';
import { LoginImage } from '@/components/login-image';

export default function LoginPage() {
  return (
    <main className="flex min-h-screen w-full flex-wrap items-center justify-center">
      <LoginImage />
      <div className="w-full p-4 lg:w-1/2 flex items-center justify-center">
        <div className="w-full max-w-md">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
