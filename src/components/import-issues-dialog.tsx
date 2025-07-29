
'use client';

import { useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { type JiraProject } from '@/lib/types';
import { type Credentials, bulkCreateIssues } from '@/lib/actions';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { AlertCircle, Download, Loader2, UploadCloud } from 'lucide-react';

interface ImportIssuesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projects: JiraProject[];
  credentials: Credentials | null;
}

export function ImportIssuesDialog({
  isOpen,
  onClose,
  projects,
  credentials,
}: ImportIssuesDialogProps) {
  const { toast } = useToast();
  const [selectedProjectKey, setSelectedProjectKey] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      setError(null);
    } else {
      setFile(null);
      setError('Please select a valid CSV file.');
    }
  };

  const handleDownloadTemplate = () => {
    const headers = ['Summary', 'Description', 'Assignee (Email)', 'Reporter (Email)', 'Issue Type', 'Story Points'];
    const csvContent = headers.join(',');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'jira-import-template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const resetState = () => {
    setSelectedProjectKey(null);
    setFile(null);
    setIsImporting(false);
    setError(null);
  }

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleImport = async () => {
    if (!selectedProjectKey || !file || !credentials) {
      setError('Please select a project and a CSV file to import.');
      return;
    }

    setIsImporting(true);
    setError(null);

    try {
        const fileContent = await file.text();
        const result = await bulkCreateIssues(selectedProjectKey, fileContent, credentials);

        if (result.success) {
            toast({
                title: 'Import Successful',
                description: 'Your issues are being created in Jira. This may take a few moments.',
            });
            handleClose();
        } else {
            setError(result.error || 'An unknown error occurred during import.');
        }
    } catch (e) {
        setError('Failed to read the file or connect to the server.');
        console.error(e);
    } finally {
        setIsImporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import Issues from CSV</DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="grid gap-2">
            <Label htmlFor="project">Select Project</Label>
            <Select onValueChange={setSelectedProjectKey} value={selectedProjectKey ?? undefined}>
              <SelectTrigger id="project">
                <SelectValue placeholder="Choose a project..." />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.key}>
                    {project.name} ({project.key})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="csv-file">Upload CSV File</Label>
            <Input id="csv-file" type="file" accept=".csv" onChange={handleFileChange} />
             <Button variant="link" size="sm" className="justify-start p-0 h-auto" onClick={handleDownloadTemplate}>
                <Download className="mr-2 h-3 w-3" />
                Download CSV Template
            </Button>
          </div>
          {error && (
             <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" onClick={handleClose}>Cancel</Button>
          </DialogClose>
          <Button onClick={handleImport} disabled={!selectedProjectKey || !file || isImporting}>
            {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
            {isImporting ? 'Importing...' : 'Import'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
