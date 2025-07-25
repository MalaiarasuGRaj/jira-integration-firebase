
'use client';

import { formatDistanceToNow, parseISO } from 'date-fns';
import {
  AlertCircle,
  Calendar,
  ChevronRight,
  ExternalLink,
  Loader2,
  Tag,
  User,
  X,
  Repeat,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from './ui/dialog';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import type { JiraIssue, JiraIssueType, JiraProject } from '@/lib/types';
import { cn } from '@/lib/utils';


function getStatusColor(statusCategoryKey: string) {
    switch (statusCategoryKey) {
      case 'new':
      case 'undefined':
        return 'bg-blue-500'; // To Do
      case 'intermediate':
        return 'bg-yellow-500'; // In Progress
      case 'done':
        return 'bg-green-500'; // Done
      default:
        return 'bg-gray-500';
    }
}


export function IssuesDialog({
  isOpen,
  onClose,
  issueType,
  project,
  issues,
  isLoading,
  error,
}: {
  isOpen: boolean;
  onClose: () => void;
  issueType: JiraIssueType | null;
  project: JiraProject | null;
  issues: JiraIssue[];
  isLoading: boolean;
  error: string | null;
}) {
  if (!issueType || !project) return null;

  const getExternalUrl = (issueKey: string) => {
    try {
      return `https://${new URL(project.self).hostname}/browse/${issueKey}`;
    } catch {
      return '#';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl p-0">
        <DialogHeader className="p-4 border-b">
          <div className="flex items-center gap-3">
            <img src={issueType.iconUrl} alt="" className="h-6 w-6" />
            <DialogTitle className="flex items-center gap-2">
              <span>{issueType.name} Issues</span>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
              <span className="text-muted-foreground">{project.name}</span>
            </DialogTitle>
          </div>
          <DialogClose asChild>
            <Button variant="ghost" size="icon" className="absolute right-4 top-4">
              <X className="h-4 w-4" />
            </Button>
          </DialogClose>
        </DialogHeader>

        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error fetching issues</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : issues.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <h3 className="text-xl font-semibold">No issues found</h3>
              <p className="text-muted-foreground">There are no issues of type "{issueType.name}" in this project.</p>
            </div>
          ) : (
            <ScrollArea className="h-[60vh]">
              <div className="space-y-4 pr-6">
                {issues.map((issue) => (
                  <Card key={issue.id} className="group">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm text-muted-foreground">{issue.key}</p>
                          <h4 className="font-semibold">{issue.summary}</h4>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className='flex items-center gap-1.5'>
                                <div className={cn('w-2.5 h-2.5 rounded-full', getStatusColor(issue.status.statusCategory.key))} />
                                <span className='text-sm font-medium'>{issue.status.name}</span>
                            </div>
                            <a href={getExternalUrl(issue.key)} target="_blank" rel="noopener noreferrer">
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                <ExternalLink className="h-4 w-4" />
                                </Button>
                            </a>
                        </div>
                      </div>
                      <Separator className="my-3" />
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span>{issue.assignee?.displayName ?? 'Unassigned'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                           <img src={issue.priority.iconUrl} alt={issue.priority.name} className='h-4 w-4'/>
                          <span>{issue.priority.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDistanceToNow(parseISO(issue.updated))} ago</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Repeat className="h-4 w-4" />
                            <span>{issue.sprint?.name ?? 'No Sprint'}</span>
                        </div>
                        {issue.labels.length > 0 && (
                            <div className='flex items-center gap-1 flex-wrap col-span-full mt-2'>
                                <Tag className='h-4 w-4' />
                                {issue.labels.map(label => <Badge key={label} variant='secondary' className='text-xs'>{label}</Badge>)}
                            </div>
                        )}
                      </div>
                      {issue.parent && (
                         <div className="mt-3 pt-3 border-t text-xs">
                           <span className="text-muted-foreground font-medium">Parent: </span>
                           <span>{issue.parent.key} - {issue.parent.fields.summary}</span>
                         </div>
                       )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
