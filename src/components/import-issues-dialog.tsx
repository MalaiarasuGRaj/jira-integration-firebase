
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
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
        const fileType = selectedFile.type;
        // Broader check for excel and csv mimetypes
        const validTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
        if (validTypes.includes(fileType) || selectedFile.name.endsWith('.csv') || selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls')) {
            setFile(selectedFile);
            setError(null);
        } else {
            setFile(null);
            setError('Please select a valid CSV or Excel file.');
        }
    }
  };

  const handleDownloadTemplate = () => {
    const headers = ['Summary', 'Description', 'Assignee (Email)', 'Reporter (Email)', 'Issue Type', 'Story Points', 'Parent Key'];
    
    // Using an array of arrays to represent rows, and then joining.
    // This makes it easier to handle quotes and commas.
    const rows = [
      headers,
      [
        'Plan Q4 Marketing Campaign',
        'High-level planning epic for all Q4 marketing activities. This includes social media, content, and paid advertising.',
        'assignee@example.com',
        'reporter@example.com',
        'Epic',
        '', // Story points are not typical for Epics
        '', // Epics do not have parents
      ],
      [
        'Develop new landing page design',
        'Create a modern and responsive design for the new product landing page. Should include wireframes and mockups.',
        'assignee@example.com',
        'reporter@example.com',
        'Story',
        '5',
        '', // This will be a parent issue, so it has no parent itself
      ],
      [
        'Create header component',
        'Build the reusable header component based on the approved design mockups.',
        'assignee@example.com',
        'reporter@example.com',
        'Subtask',
        '', // Subtasks often inherit story points from parent, or are not pointed
        '', // NOTE: The Parent Key should be updated to the actual key of the parent story after it's created. Use a placeholder or leave blank if importing together.
      ],
      [
        'Fix login button alignment on mobile',
        'The login button is misaligned on screens smaller than 375px.',
        'assignee@example.com',
        'reporter@example.com',
        'Task',
        '1',
        '',
      ]
    ];

    // Function to safely format a cell for CSV, quoting if necessary
    const formatCell = (cell: string) => {
        const strCell = String(cell ?? '');
        // Quote the cell if it contains a comma, a quote, or a newline.
        if (strCell.includes(',') || strCell.includes('"') || strCell.includes('\n')) {
            // Escape any existing double quotes by doubling them up
            return `"${strCell.replace(/"/g, '""')}"`;
        }
        return strCell;
    };

    const csvContent = rows.map(row => row.map(formatCell).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'jira-import-example.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const resetState = () => {
    setSelectedProjectId(null);
    setFile(null);
    setIsImporting(false);
    setError(null);
  }

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleImport = async () => {
    if (!selectedProjectId || !file || !credentials) {
      setError('Please select a project and a file to import.');
      return;
    }

    setIsImporting(true);
    setError(null);

    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('projectId', selectedProjectId);
        formData.append('credentials', JSON.stringify(credentials));

        const result = await bulkCreateIssues(formData);

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
          <DialogTitle>Import Issues from File</DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="grid gap-2">
            <Label htmlFor="project">Select Project</Label>
            <Select onValueChange={setSelectedProjectId} value={selectedProjectId ?? undefined}>
              <SelectTrigger id="project">
                <SelectValue placeholder="Choose a project..." />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name} ({project.key})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="upload-file">Upload CSV or Excel File</Label>
            <Input id="upload-file" type="file" accept=".csv, .xlsx, .xls, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" onChange={handleFileChange} />
             <Button variant="link" size="sm" className="justify-start p-0 h-auto" onClick={handleDownloadTemplate}>
                <Download className="mr-2 h-3 w-3" />
                Download Example CSV
            </Button>
          </div>
          {error && (
             <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Import Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" onClick={handleClose}>Cancel</Button>
          </DialogClose>
          <Button onClick={handleImport} disabled={!selectedProjectId || !file || isImporting}>
            {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
            {isImporting ? 'Importing...' : 'Import'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
