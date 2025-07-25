'use client';

import { useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { login, type State } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, LinkIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

function LoginButton() {
  const { pending } = useFormStatus();
  return (
    <Button className="w-full" type="submit" aria-disabled={pending}>
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      {pending ? 'Authenticating...' : 'Log In to Jira'}
    </Button>
  );
}

export function LoginForm() {
  const initialState: State = { message: null, errors: {} };
  const [state, dispatch] = useActionState(login, initialState);
  const { toast } = useToast();

  useEffect(() => {
    if (state.errors?.api) {
      toast({
        variant: 'destructive',
        title: 'Authentication Failed',
        description: state.errors.api.join(', '),
      });
    }
  }, [state, toast]);

  return (
    <form action={dispatch}>
      <Card className="border-0 shadow-none sm:border sm:shadow-sm">
        <CardHeader>
          <div className="flex justify-start items-center mb-2">
            <LinkIcon className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold ml-2 tracking-tight">
              Jira-Integration
            </h1>
          </div>
          <CardTitle>Secure Login</CardTitle>
          <CardDescription>
            Enter your Jira credentials to connect your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Jira Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
              aria-describedby="email-error"
            />
            <div id="email-error" aria-live="polite" aria-atomic="true">
              {state.errors?.email &&
                state.errors.email.map((error: string) => (
                  <p className="mt-2 text-sm text-destructive" key={error}>
                    {error}
                  </p>
                ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="domain">Jira Domain</Label>
            <Input
              id="domain"
              name="domain"
              type="text"
              placeholder="your-company.atlassian.net"
              required
              aria-describedby="domain-error"
            />
            <div id="domain-error" aria-live="polite" aria-atomic="true">
              {state.errors?.domain &&
                state.errors.domain.map((error: string) => (
                  <p className="mt-2 text-sm text-destructive" key={error}>
                    {error}
                  </p>
                ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="apiToken">Jira API Token</Label>
            <Input
              id="apiToken"
              name="apiToken"
              type="password"
              required
              aria-describedby="apiToken-error"
            />
            <div id="apiToken-error" aria-live="polite" aria-atomic="true">
              {state.errors?.apiToken &&
                state.errors.apiToken.map((error: string) => (
                  <p className="mt-2 text-sm text-destructive" key={error}>
                    {error}
                  </p>
                ))}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex-col items-start">
          <LoginButton />
          <p className="text-xs text-muted-foreground mt-4">
            Your API token is used to securely connect to your Jira instance and
            is stored encrypted.
          </p>
        </CardFooter>
      </Card>
    </form>
  );
}
