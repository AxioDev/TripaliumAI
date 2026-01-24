'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Education } from '@/lib/api-client';
import { Plus, Pencil, Trash2, GraduationCap } from 'lucide-react';

interface EducationEditorProps {
  educations: Education[];
  onSave: (educations: Omit<Education, 'id'>[]) => Promise<void>;
  isLoading?: boolean;
}

interface EducationFormData {
  institution: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string;
  gpa: string;
  description: string;
}

const emptyForm: EducationFormData = {
  institution: '',
  degree: '',
  field: '',
  startDate: '',
  endDate: '',
  gpa: '',
  description: '',
};

export function EducationEditor({
  educations,
  onSave,
  isLoading,
}: EducationEditorProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState<EducationFormData>(emptyForm);
  const [localEducations, setLocalEducations] = useState(educations);
  const [hasChanges, setHasChanges] = useState(false);

  const openAddDialog = () => {
    setEditIndex(null);
    setFormData(emptyForm);
    setIsDialogOpen(true);
  };

  const openEditDialog = (index: number) => {
    const edu = localEducations[index];
    setEditIndex(index);
    setFormData({
      institution: edu.institution,
      degree: edu.degree,
      field: edu.field || '',
      startDate: edu.startDate ? edu.startDate.substring(0, 7) : '',
      endDate: edu.endDate ? edu.endDate.substring(0, 7) : '',
      gpa: edu.gpa || '',
      description: edu.description || '',
    });
    setIsDialogOpen(true);
  };

  const handleSaveItem = () => {
    const newEdu: Omit<Education, 'id'> = {
      institution: formData.institution,
      degree: formData.degree,
      field: formData.field || null,
      startDate: formData.startDate ? `${formData.startDate}-01` : null,
      endDate: formData.endDate ? `${formData.endDate}-01` : null,
      gpa: formData.gpa || null,
      description: formData.description || null,
    };

    if (editIndex !== null) {
      const updated = [...localEducations];
      updated[editIndex] = { ...updated[editIndex], ...newEdu };
      setLocalEducations(updated);
    } else {
      setLocalEducations([...localEducations, newEdu as Education]);
    }

    setHasChanges(true);
    setIsDialogOpen(false);
  };

  const handleDelete = (index: number) => {
    setLocalEducations(localEducations.filter((_, i) => i !== index));
    setHasChanges(true);
  };

  const handleSaveAll = async () => {
    await onSave(
      localEducations.map((edu) => ({
        institution: edu.institution,
        degree: edu.degree,
        field: edu.field,
        startDate: edu.startDate,
        endDate: edu.endDate,
        gpa: edu.gpa,
        description: edu.description,
      }))
    );
    setHasChanges(false);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric' });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Education</CardTitle>
          <CardDescription>
            {localEducations.length} degree(s)
          </CardDescription>
        </div>
        <Button onClick={openAddDialog} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {localEducations.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No education added. Upload a CV to extract your education or add manually.
          </p>
        ) : (
          localEducations.map((edu, index) => (
            <div
              key={edu.id || index}
              className="flex items-start gap-4 p-4 border rounded-lg"
            >
              <div className="rounded-full bg-muted p-2">
                <GraduationCap className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium">
                      {edu.degree}
                      {edu.field && ` in ${edu.field}`}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {edu.institution}
                    </p>
                  </div>
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    {formatDate(edu.startDate)}
                    {edu.endDate && ` - ${formatDate(edu.endDate)}`}
                  </span>
                </div>
                {edu.gpa && (
                  <p className="text-sm mt-1">GPA: {edu.gpa}</p>
                )}
                {edu.description && (
                  <p className="text-sm mt-2 text-muted-foreground">
                    {edu.description}
                  </p>
                )}
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openEditDialog(index)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(index)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))
        )}

        {hasChanges && (
          <div className="flex justify-end pt-4 border-t">
            <Button onClick={handleSaveAll} disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        )}
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editIndex !== null ? 'Edit Education' : 'Add Education'}
            </DialogTitle>
            <DialogDescription>
              Enter the details of your education
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="institution">Institution</Label>
              <Input
                id="institution"
                value={formData.institution}
                onChange={(e) =>
                  setFormData({ ...formData, institution: e.target.value })
                }
                placeholder="University of Paris"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="degree">Degree</Label>
                <Input
                  id="degree"
                  value={formData.degree}
                  onChange={(e) =>
                    setFormData({ ...formData, degree: e.target.value })
                  }
                  placeholder="Bachelor's, Master's, PhD"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="field">Field of Study</Label>
                <Input
                  id="field"
                  value={formData.field}
                  onChange={(e) =>
                    setFormData({ ...formData, field: e.target.value })
                  }
                  placeholder="Computer Science"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="eduStartDate">Start Year</Label>
                <Input
                  id="eduStartDate"
                  type="month"
                  value={formData.startDate}
                  onChange={(e) =>
                    setFormData({ ...formData, startDate: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="eduEndDate">End Year</Label>
                <Input
                  id="eduEndDate"
                  type="month"
                  value={formData.endDate}
                  onChange={(e) =>
                    setFormData({ ...formData, endDate: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gpa">GPA (optional)</Label>
              <Input
                id="gpa"
                value={formData.gpa}
                onChange={(e) =>
                  setFormData({ ...formData, gpa: e.target.value })
                }
                placeholder="3.8/4.0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="eduDescription">Description (optional)</Label>
              <textarea
                id="eduDescription"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Notable achievements, activities, thesis..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveItem}
              disabled={!formData.institution || !formData.degree}
            >
              {editIndex !== null ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
