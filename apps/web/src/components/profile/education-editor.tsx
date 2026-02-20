'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Education } from '@/lib/api-client';
import { Plus, Pencil, Trash2, GraduationCap, Loader2 } from 'lucide-react';

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
  const t = useTranslations('profile');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState<EducationFormData>(emptyForm);
  const [localEducations, setLocalEducations] = useState(educations);
  const [hasChanges, setHasChanges] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

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
    setDeleteIndex(null);
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
    return date.toLocaleDateString(undefined, { year: 'numeric' });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {t('education.count', { count: localEducations.length })}
        </p>
        <Button onClick={openAddDialog} size="sm">
          <Plus className="h-4 w-4 mr-1" /> {t('add')}
        </Button>
      </div>

      {localEducations.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          {t('education.empty')}
        </p>
      ) : (
        localEducations.map((edu, index) => (
          <div
            key={edu.id || index}
            className="p-3 sm:p-4 border rounded-lg"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5 sm:gap-3 min-w-0 flex-1">
                <div className="rounded-full bg-muted p-1.5 sm:p-2 shrink-0 mt-0.5">
                  <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-medium text-sm sm:text-base">
                    {edu.degree}
                    {edu.field && ` ${t('education.in')} ${edu.field}`}
                  </h4>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {edu.institution}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDate(edu.startDate)}
                    {edu.endDate && ` - ${formatDate(edu.endDate)}`}
                  </p>
                </div>
              </div>
              <div className="flex gap-0.5 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 sm:h-9 sm:w-9"
                  onClick={() => openEditDialog(index)}
                >
                  <Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 sm:h-9 sm:w-9"
                  onClick={() => setDeleteIndex(index)}
                >
                  <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-destructive" />
                </Button>
              </div>
            </div>
            {edu.gpa && (
              <p className="text-xs sm:text-sm mt-1 ml-9 sm:ml-11">{t('education.gpa').replace(' (optional)', '')}: {edu.gpa}</p>
            )}
            {edu.description && (
              <p className="text-xs sm:text-sm mt-2 ml-9 sm:ml-11 text-muted-foreground line-clamp-3">
                {edu.description}
              </p>
            )}
          </div>
        ))
      )}

      {hasChanges && (
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={handleSaveAll} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('saving')}
              </>
            ) : (
              t('saveChanges')
            )}
          </Button>
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editIndex !== null ? t('education.editTitle') : t('education.addTitle')}
            </DialogTitle>
            <DialogDescription>
              {t('education.dialogDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="institution">{t('education.institution')}</Label>
              <Input
                id="institution"
                value={formData.institution}
                onChange={(e) =>
                  setFormData({ ...formData, institution: e.target.value })
                }
                placeholder={t('education.institutionPlaceholder')}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="degree">{t('education.degree')}</Label>
                <Input
                  id="degree"
                  value={formData.degree}
                  onChange={(e) =>
                    setFormData({ ...formData, degree: e.target.value })
                  }
                  placeholder={t('education.degreePlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="field">{t('education.field')}</Label>
                <Input
                  id="field"
                  value={formData.field}
                  onChange={(e) =>
                    setFormData({ ...formData, field: e.target.value })
                  }
                  placeholder={t('education.fieldPlaceholder')}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="eduStartDate">{t('education.startYear')}</Label>
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
                <Label htmlFor="eduEndDate">{t('education.endYear')}</Label>
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
              <Label htmlFor="gpa">{t('education.gpa')}</Label>
              <Input
                id="gpa"
                value={formData.gpa}
                onChange={(e) =>
                  setFormData({ ...formData, gpa: e.target.value })
                }
                placeholder={t('education.gpaPlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="eduDescription">{t('education.descriptionLabel')}</Label>
              <Textarea
                id="eduDescription"
                className="min-h-[80px]"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder={t('education.descriptionPlaceholder')}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button
              onClick={handleSaveItem}
              disabled={!formData.institution || !formData.degree}
            >
              {editIndex !== null ? t('update') : t('add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteIndex !== null} onOpenChange={() => setDeleteIndex(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteConfirm.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteConfirm.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteIndex !== null) handleDelete(deleteIndex);
              }}
            >
              {t('deleteConfirm.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
