
'use client';

import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { JiraIssue, JiraProject, JiraUser, JiraPriority } from '@/lib/types';
import { type Credentials, getUsersForProject, getPriorities, updateIssue } from '@/lib/actions';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';

interface EditIssueDialogProps {
  isOpen: boolean;
  onClose: () => void;
  issue: JiraIssue;
  project: JiraProject;
  credentials: Credentials | null;
  onSuccessfulUpdate: (updatedIssue: JiraIssue) => void;
}

const editIssueFormSchema = z.object({
  summary: z.string().min(1, { message: 'Summary cannot be empty.' }),
  description: z.string().optional(),
  assignee: z.string().optional().nullable(),
  reporter: z.string().optional().nullable(),
  priority: z.string().optional(),
});

type EditIssueFormValues = z.infer<typeof editIssueFormSchema>;

function parseDescription(description: JiraIssue['description']): string {
    if (!description || !description.content) return '';
    return description.content
      .filter(block => block.type === 'paragraph')
      .map(block => 
        block.content
          ?.filter(inline => inline.type === 'text')
          .map(inline => inline.text)
          .join('') || ''
      )
      .join('\n');
}

export function EditIssueDialog({
  isOpen,
  onClose,
  issue,
  project,
  credentials,
  onSuccessfulUpdate,
}: EditIssueDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [users, setUsers] = useState<JiraUser[]>([]);
  const [priorities, setPriorities] = useState<JiraPriority[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const {
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<EditIssueFormValues>({
    resolver: zodResolver(editIssueFormSchema),
    defaultValues: {
      summary: issue.summary,
      description: parseDescription(issue.description),
      assignee: issue.assignee?.accountId || null,
      reporter: issue.reporter?.accountId,
      priority: issue.priority?.id,
    },
  });
  
  useEffect(() => {
    if (isOpen && credentials) {
      setIsLoading(true);
      Promise.all([
        getUsersForProject(project.key, credentials),
        getPriorities(credentials),
      ]).then(([usersResult, prioritiesResult]) => {
        if (usersResult.users) setUsers(usersResult.users);
        else console.error(usersResult.error);
        
        if (prioritiesResult.priorities) setPriorities(prioritiesResult.priorities);
        else console.error(prioritiesResult.error);
        
        setIsLoading(false);
      });
    }
  }, [isOpen, project.key, credentials]);

  useEffect(() => {
    reset({
        summary: issue.summary,
        description: parseDescription(issue.description),
        assignee: issue.assignee?.accountId || null,
        reporter: issue.reporter?.accountId,
        priority: issue.priority?.id,
    });
  }, [issue, reset]);


  const onSubmit = async (data: EditIssueFormValues) => {
    if (!credentials) {
      setError('Authentication credentials are not available.');
      return;
    }
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.append('summary', data.summary);
    if(data.description) formData.append('description', data.description);
    if(data.assignee) formData.append('assignee', data.assignee);
    if(data.reporter) formData.append('reporter', data.reporter);
    if(data.priority) formData.append('priority', data.priority);

    const result = await updateIssue(issue.key, formData, credentials);

    setIsSubmitting(false);

    if (result.success) {
      toast({
        title: 'Issue Updated',
        description: `Issue ${issue.key} has been updated successfully.`,
      });
      onSuccessfulUpdate({
        ...issue, 
        summary: data.summary,
        description: { type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text: data.description || '' }] }] },
        assignee: users.find(u => u.accountId === data.assignee) || null,
        reporter: users.find(u => u.accountId === data.reporter)!,
        priority: priorities.find(p => p.id === data.priority) || issue.priority
      });
      onClose();
    } else {
      setError(result.error || 'An unknown error occurred.');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Issue: {issue.key}</DialogTitle>
        </DialogHeader>
        {isLoading ? (
            <div className="flex justify-center items-center h-48">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6 py-4">
          <div className="grid gap-2">
            <Label htmlFor="summary">Summary</Label>
            <Controller
              name="summary"
              control={control}
              render={({ field }) => <Input id="summary" {...field} />}
            />
            {errors.summary && <p className="text-sm text-destructive">{errors.summary.message}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Controller
              name="description"
              control={control}
              render={({ field }) => <Textarea id="description" {...field} rows={6} />}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
                <Label htmlFor="assignee">Assignee</Label>
                <Controller
                name="assignee"
                control={control}
                render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                    <SelectTrigger id="assignee">
                        <SelectValue placeholder="Select assignee..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="">Unassigned</SelectItem>
                        {users.map((user) => (
                        <SelectItem key={user.accountId} value={user.accountId}>
                            {user.displayName}
                        </SelectItem>
                        ))}
                    </SelectContent>
                    </Select>
                )}
                />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="reporter">Reporter</Label>
                <Controller
                name="reporter"
                control={control}
                render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                    <SelectTrigger id="reporter">
                        <SelectValue placeholder="Select reporter..." />
                    </SelectTrigger>
                    <SelectContent>
                        {users.map((user) => (
                        <SelectItem key={user.accountId} value={user.accountId}>
                            {user.displayName}
                        </SelectItem>
                        ))}
                    </SelectContent>
                    </Select>
                )}
                />
            </div>
          </div>

          <div className="grid gap-2">
                <Label htmlFor="priority">Priority</Label>
                <Controller
                name="priority"
                control={control}
                render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger id="priority">
                        <SelectValue placeholder="Select priority..." />
                    </SelectTrigger>
                    <SelectContent>
                        {priorities.map((priority) => (
                        <SelectItem key={priority.id} value={priority.id}>
                            {priority.name}
                        </SelectItem>
                        ))}
                    </SelectContent>
                    </Select>
                )}
                />
            </div>
          
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Update Failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
