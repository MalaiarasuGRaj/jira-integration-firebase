
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
import type { JiraIssue, JiraProject, JiraUser, JiraPriority, JiraTransition } from '@/lib/types';
import { type Credentials, getUsersForProject, getPriorities, updateIssue, getEditMeta, getAvailableTransitions } from '@/lib/actions';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

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
  status: z.string().optional(),
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
  const [transitions, setTransitions] = useState<JiraTransition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [editableFields, setEditableFields] = useState<Record<string, boolean>>({
    priority: false,
    status: false,
  });

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
      assignee: issue.assignee?.accountId || 'unassigned',
      reporter: issue.reporter?.accountId,
      priority: issue.priority?.id,
      status: issue.status?.id,
    },
  });
  
  useEffect(() => {
    if (isOpen && credentials) {
      setIsLoading(true);
      Promise.all([
        getUsersForProject(project.key, credentials),
        getPriorities(credentials),
        getEditMeta(issue.key, credentials),
        getAvailableTransitions(issue.key, credentials),
      ]).then(([usersResult, prioritiesResult, editMetaResult, transitionsResult]) => {
        if (usersResult.users) setUsers(usersResult.users);
        else console.error(usersResult.error);
        
        if (prioritiesResult.priorities) {
            const filteredPriorities = prioritiesResult.priorities.filter(p => 
                ['High', 'Medium', 'Low'].includes(p.name)
            );
            setPriorities(filteredPriorities);
        } else {
            console.error(prioritiesResult.error);
        }

        if (editMetaResult.fields) {
            setEditableFields({
                priority: 'priority' in editMetaResult.fields,
                status: 'status' in editMetaResult.fields,
            });
        } else {
            setEditableFields({ priority: false, status: false });
            console.error(editMetaResult.error);
        }

        if (transitionsResult.transitions) {
            setTransitions(transitionsResult.transitions);
        } else {
            console.error(transitionsResult.error);
        }
        
        setIsLoading(false);
      });
    }
  }, [isOpen, issue, project.key, credentials]);

  useEffect(() => {
    reset({
        summary: issue.summary,
        description: parseDescription(issue.description),
        assignee: issue.assignee?.accountId || 'unassigned',
        reporter: issue.reporter?.accountId,
        priority: issue.priority?.id,
        status: issue.status?.id,
    });
  }, [issue, reset]);


  const onSubmit = async (data: EditIssueFormValues) => {
    if (!credentials) {
      setError('Authentication credentials are not available.');
      return;
    }
    setIsSubmitting(true);
    setError(null);

    const result = await updateIssue(issue, data, credentials);

    setIsSubmitting(false);

    if (result.success) {
      toast({
        title: 'Issue Updated',
        description: `Issue ${issue.key} has been updated successfully.`,
      });
      // Refetch the entire issue to get the most up-to-date state
      const updatedAssignee = users.find(u => u.accountId === data.assignee) || null;
      const updatedReporter = users.find(u => u.accountId === data.reporter);
      const updatedPriority = priorities.find(p => p.id === data.priority);
      const updatedTransition = transitions.find(t => t.id === data.status);

      onSuccessfulUpdate({
        ...issue, 
        summary: data.summary,
        description: { type: 'doc', version: 1, content: data.description ? [{ type: 'paragraph', content: [{ type: 'text', text: data.description }] }] : [] },
        assignee: updatedAssignee,
        reporter: updatedReporter || issue.reporter,
        priority: updatedPriority || issue.priority,
        status: updatedTransition ? updatedTransition.to : issue.status,
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
              render={({ field }) => <Textarea id="description" {...field} value={field.value ?? ''} rows={6} />}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
                <Label htmlFor="assignee">Assignee</Label>
                <Controller
                name="assignee"
                control={control}
                render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value || 'unassigned'}>
                    <SelectTrigger id="assignee">
                        <SelectValue placeholder="Select assignee..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
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
          
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {editableFields.priority && (
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
            )}
             <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Controller
                name="status"
                control={control}
                render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger id="status">
                            <SelectValue placeholder="Select status..." />
                        </SelectTrigger>
                        <SelectContent>
                            {/* The current status is always an option */}
                            <SelectItem key={issue.status.id} value={issue.status.id}>
                                {issue.status.name}
                            </SelectItem>
                            {/* Available transitions */}
                            {transitions.map((transition) => (
                                <SelectItem key={transition.id} value={transition.id}>
                                    {transition.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
                />
            </div>

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
