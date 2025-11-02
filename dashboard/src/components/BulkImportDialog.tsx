import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { memberAPI } from '@/lib/api';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, FileText, AlertCircle, CheckCircle, X } from 'lucide-react';

interface BulkImportDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

interface ImportResult {
    successCount: number;
    failedCount: number;
    duplicates: number;
    totalProcessed: number;
    errors?: Array<{ row: number; error: string }>;
}

export function BulkImportDialog({ open, onOpenChange }: BulkImportDialogProps) {
    const [file, setFile] = useState<File | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const [importResult, setImportResult] = useState<ImportResult | null>(null);
    const queryClient = useQueryClient();

    const importMutation = useMutation({
        mutationFn: (file: File) => memberAPI.bulkImport(file),
        onSuccess: (response: any) => {
            setImportResult(response.data.data);
            queryClient.invalidateQueries({ queryKey: ['members'] });
        },
    });

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const droppedFile = e.dataTransfer.files[0];
            if (droppedFile.type === 'text/csv' || droppedFile.name.endsWith('.csv')) {
                setFile(droppedFile);
            }
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleImport = async () => {
        if (!file) return;
        importMutation.mutate(file);
    };

    const handleClose = () => {
        setFile(null);
        setImportResult(null);
        onOpenChange(false);
    };

    const downloadTemplate = () => {
        const csvContent = 'name,phone,email,city,working_knowledge,degree,branch,organization_name,designation\n' +
            'John Doe,1234567890,john@example.com,Chennai,Software Development,B.E,Computer Science,Tech Corp,Senior Developer\n' +
            'Jane Smith,0987654321,jane@example.com,Bangalore,Data Science,M.Sc,Statistics,Data Inc,Data Scientist';

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'members_template.csv';
        a.click();
        window.URL.revokeObjectURL(url);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Bulk Import Members</DialogTitle>
                    <DialogDescription>
                        Upload a CSV file to import multiple members at once
                    </DialogDescription>
                </DialogHeader>

                {!importResult ? (
                    <div className="space-y-4">
                        <div
                            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragActive ? 'border-primary bg-primary/5' : 'border-gray-300'
                                }`}
                            onDragEnter={handleDrag}
                            onDragOver={handleDrag}
                            onDragLeave={handleDrag}
                            onDrop={handleDrop}
                        >
                            <input
                                type="file"
                                accept=".csv"
                                onChange={handleFileChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <div className="space-y-4">
                                <div className="flex justify-center">
                                    {file ? (
                                        <FileText className="h-12 w-12 text-primary" />
                                    ) : (
                                        <Upload className="h-12 w-12 text-gray-400" />
                                    )}
                                </div>
                                <div>
                                    {file ? (
                                        <div className="space-y-2">
                                            <p className="font-medium">{file.name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {(file.size / 1024).toFixed(2)} KB
                                            </p>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setFile(null);
                                                }}
                                            >
                                                <X className="h-4 w-4 mr-2" />
                                                Remove
                                            </Button>
                                        </div>
                                    ) : (
                                        <>
                                            <p className="text-sm font-medium">
                                                Drop your CSV file here or click to browse
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Maximum file size: 5MB
                                            </p>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <h4 className="font-medium text-sm mb-2">CSV Format Requirements:</h4>
                            <ul className="text-xs text-muted-foreground space-y-1">
                                <li>• Required columns: <code>name</code>, <code>phone</code></li>
                                <li>• Optional columns: <code>email</code>, <code>city</code>, <code>working_knowledge</code>, <code>degree</code>, <code>branch</code>, <code>organization_name</code>, <code>designation</code></li>
                                <li>• First row should contain column headers</li>
                                <li>• Phone numbers must be unique</li>
                            </ul>
                            <Button
                                variant="link"
                                size="sm"
                                onClick={downloadTemplate}
                                className="mt-2 p-0 h-auto"
                            >
                                Download CSV Template
                            </Button>
                        </div>

                        {importMutation.isError && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                                <div className="text-sm text-red-800">
                                    {importMutation.error instanceof Error
                                        ? importMutation.error.message
                                        : 'Failed to import members'}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="font-medium text-green-900">Import Complete</h4>
                                    <div className="mt-2 text-sm text-green-800 space-y-1">
                                        <p>✓ Successfully imported: {importResult.successCount} members</p>
                                        {importResult.failedCount > 0 && (
                                            <p>✗ Failed to import: {importResult.failedCount} members</p>
                                        )}
                                        {importResult.duplicates > 0 && (
                                            <p>⚠ Duplicates skipped: {importResult.duplicates} members</p>
                                        )}
                                        <p className="mt-2 font-medium">
                                            Total processed: {importResult.totalProcessed} rows
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {importResult.errors && importResult.errors.length > 0 && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                <h4 className="font-medium text-sm mb-2">Import Errors:</h4>
                                <div className="max-h-40 overflow-y-auto space-y-1">
                                    {importResult.errors.map((error, idx) => (
                                        <p key={idx} className="text-xs text-muted-foreground">
                                            Row {error.row}: {error.error}
                                        </p>
                                    ))}
                                    {importResult.failedCount > importResult.errors.length && (
                                        <p className="text-xs text-muted-foreground italic">
                                            ... and {importResult.failedCount - importResult.errors.length} more errors
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={handleClose}>
                        {importResult ? 'Close' : 'Cancel'}
                    </Button>
                    {!importResult && (
                        <Button
                            onClick={handleImport}
                            disabled={!file || importMutation.isPending}
                        >
                            {importMutation.isPending ? 'Importing...' : 'Import Members'}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
