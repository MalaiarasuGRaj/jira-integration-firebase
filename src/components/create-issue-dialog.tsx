
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
import type { JiraProject, JiraUser, JiraIssueType } from '@/lib/types';
import { type Credentials, getUsersForProject, getIssueTypesForProject, createIssue } from '@/lib/actions';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';

interface CreateIssueDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projects: JiraProject[];
  credentials: Credentials | null;
}

const createIssueFormSchema = z.object({
  projectId: z.string().min(1, { message: 'Please select a project.' }),
  issueTypeId: z.string().min(1, { message: 'Please select an issue type.' }),
  summary: z.string().min(1, { message: 'Summary is required.' }),
  description: z.string().optional(),
  assigneeId: z.string().optional(),
});

type CreateIssueFormValues = z.infer<typeof createIssueFormSchema>;

export function CreateIssueDialog({
  isOpen,
  onClose,
  projects,
  credentials,
}: CreateIssueDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedProject, setSelectedProject] = useState<JiraProject | null>(null);
  const [issueTypes, setIssueTypes] = useState<JiraIssueType[]>([]);
  const [users, setUsers] = useState<JiraUser[]>([]);
  
  const [isLoadingIssueTypes, setIsLoadingIssueTypes] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);


  const {
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm<CreateIssueFormValues>({
    resolver: zodResolver(createIssueFormSchema),
    defaultValues: {
      projectId: '',
      issueTypeId: '',
      summary: '',
      description: '',
      assigneeId: 'unassigned',
    },
  });

  const watchedProjectId = watch('projectId');

  useEffect(() => {
    if (isOpen) {
      reset();
      setSelectedProject(null);
      setIssueTypes([]);
      setUsers([]);
    }
  }, [isOpen, reset]);

  useEffect(() => {
    if (!watchedProjectId || !credentials) return;

    const project = projects.find(p => p.id === watchedProjectId);
    setSelectedProject(project || null);
    
    // Reset downstream fields
    reset({ ...watch(), issueTypeId: '', assigneeId: 'unassigned' });
    setIssueTypes([]);
    setUsers([]);

    if (project) {
        setIsLoadingIssueTypes(true);
        getIssueTypesForProject(project.id, credentials).then(result => {
            if (result.issueTypes) setIssueTypes(result.issueTypes);
            else console.error(result.error);
            setIsLoadingIssueTypes(false);
        });

        setIsLoadingUsers(true);
        getUsersForProject(project.key, credentials).then(result => {
            if (result.users) setUsers(result.users);
            else console.error(result.error);
            setIsLoadingUsers(false);
        });
    }
  }, [watchedProjectId, credentials, projects, reset, watch]);


  const onSubmit = async (data: CreateIssueFormValues) => {
    if (!credentials) {
      setError('Authentication credentials are not available.');
      return;
    }
    setIsSubmitting(true);
    setError(null);

    const result = await createIssue(data, credentials);

    setIsSubmitting(false);

    if (result.success) {
      toast({
        title: 'Issue Created',
        description: `Issue ${result.issueKey} has been created successfully.`,
      });
      onClose();
    } else {
      setError(result.error || 'An unknown error occurred.');
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Create New Issue</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
                <Label htmlFor="project">Project</Label>
                <Controller
                    name="projectId"
                    control={control}
                    render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger id="project">
                            <SelectValue placeholder="Select a project..." />
                        </SelectTrigger>
                        <SelectContent>
                            {projects.map((project) => (
                            <SelectItem key={project.id} value={project.id}>
                                {project.name}
                            </SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                    )}
                />
                {errors.projectId && <p className="text-sm text-destructive">{errors.projectId.message}</p>}
            </div>
            <div className="grid gap-2">
                <Label htmlFor="issueType">Issue Type</Label>
                <Controller
                    name="issueTypeId"
                    control={control}
                    render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value} disabled={!selectedProject || isLoadingIssueTypes}>
                        <SelectTrigger id="issueType">
                            <SelectValue placeholder={isLoadingIssueTypes ? "Loading..." : "Select an issue type..."} />
                        </SelectTrigger>
                        <SelectContent>
                            {issueTypes.map((type) => (
                                <SelectItem key={type.id} value={type.id}>
                                    {type.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                    )}
                />
                 {errors.issueTypeId && <p className="text-sm text-destructive">{errors.issueTypeId.message}</p>}
            </div>
          </div>
          
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
              render={({ field }) => <Textarea id="description" {...field} value={field.value ?? ''} rows={4} />}
            />
          </div>
          
          <div className="grid gap-2">
                <Label htmlFor="assignee">Assignee</Label>
                <Controller
                name="assigneeId"
                control={control}
                render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value || 'unassigned'} disabled={!selectedProject || isLoadingUsers}>
                    <SelectTrigger id="assignee">
                        <SelectValue placeholder={isLoadingUsers ? "Loading..." : "Select an assignee..."}/>
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
          
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Create Failed</AlertTitle>
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
              {isSubmitting ? 'Creating...' : 'Create Issue'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
