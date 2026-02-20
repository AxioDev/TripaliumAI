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
import { WorkExperience } from '@/lib/api-client';
import { Plus, Pencil, Trash2, Briefcase } from 'lucide-react';

interface WorkExperienceEditorProps {
  experiences: WorkExperience[];
  onSave: (experiences: Omit<WorkExperience, 'id'>[]) => Promise<void>;
  isLoading?: boolean;
}

interface ExperienceFormData {
  company: string;
  title: string;
  location: string;
  startDate: string;
  endDate: string;
  description: string;
  highlights: string;
}

const emptyForm: ExperienceFormData = {
  company: '',
  title: '',
  location: '',
  startDate: '',
  endDate: '',
  description: '',
  highlights: '',
};

export function WorkExperienceEditor({
  experiences,
  onSave,
  isLoading,
}: WorkExperienceEditorProps) {
  const t = useTranslations('profile');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState<ExperienceFormData>(emptyForm);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  const openAddDialog = () => {
    setEditIndex(null);
    setFormData(emptyForm);
    setIsDialogOpen(true);
  };

  const openEditDialog = (index: number) => {
    const exp = experiences[index];
    setEditIndex(index);
    setFormData({
      company: exp.company,
      title: exp.title,
      location: exp.location || '',
      startDate: exp.startDate ? exp.startDate.substring(0, 7) : '',
      endDate: exp.endDate ? exp.endDate.substring(0, 7) : '',
      description: exp.description || '',
      highlights: exp.highlights?.join('\n') || '',
    });
    setIsDialogOpen(true);
  };

  const toPayload = (exps: WorkExperience[]): Omit<WorkExperience, 'id'>[] =>
    exps.map((exp) => ({
      company: exp.company,
      title: exp.title,
      location: exp.location,
      startDate: exp.startDate,
      endDate: exp.endDate,
      description: exp.description,
      highlights: exp.highlights,
    }));

  const handleSaveItem = async () => {
    const newExp: Omit<WorkExperience, 'id'> = {
      company: formData.company,
      title: formData.title,
      location: formData.location || null,
      startDate: formData.startDate ? `${formData.startDate}-01` : '',
      endDate: formData.endDate ? `${formData.endDate}-01` : null,
      description: formData.description || null,
      highlights: formData.highlights
        .split('\n')
        .map((h) => h.trim())
        .filter((h) => h.length > 0),
    };

    let updated: WorkExperience[];
    if (editIndex !== null) {
      updated = [...experiences];
      updated[editIndex] = { ...updated[editIndex], ...newExp };
    } else {
      updated = [...experiences, newExp as WorkExperience];
    }

    setIsDialogOpen(false);
    await onSave(toPayload(updated));
  };

  const handleDelete = async (index: number) => {
    setDeleteIndex(null);
    const updated = experiences.filter((_, i) => i !== index);
    await onSave(toPayload(updated));
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return t('present');
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {t('experience.count', { count: experiences.length })}
        </p>
        <Button onClick={openAddDialog} size="sm" disabled={isLoading}>
          <Plus className="h-4 w-4 mr-1" /> {t('add')}
        </Button>
      </div>

      {experiences.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 px-4 border border-dashed rounded-lg">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
            <Briefcase className="h-6 w-6 text-muted-foreground" />
          </div>
          <h4 className="text-sm font-medium mb-1">{t('experience.emptyTitle')}</h4>
          <p className="text-xs text-muted-foreground text-center max-w-xs mb-1">
            {t('experience.emptyDescription')}
          </p>
          <p className="text-xs text-success font-medium">{t('experience.emptyBoost')}</p>
        </div>
      ) : (
        experiences.map((exp, index) => (
          <div
            key={exp.id || index}
            className="p-3 sm:p-4 border rounded-lg"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h4 className="font-medium text-sm sm:text-base">{exp.title}</h4>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {exp.company}
                  {exp.location && ` - ${exp.location}`}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatDate(exp.startDate)} - {formatDate(exp.endDate)}
                </p>
              </div>
              <div className="flex gap-0.5 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 sm:h-9 sm:w-9"
                  onClick={() => openEditDialog(index)}
                  disabled={isLoading}
                >
                  <Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 sm:h-9 sm:w-9"
                  onClick={() => setDeleteIndex(index)}
                  disabled={isLoading}
                >
                  <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-destructive" />
                </Button>
              </div>
            </div>
            {exp.description && (
              <p className="text-xs sm:text-sm mt-2 line-clamp-3">{exp.description}</p>
            )}
            {exp.highlights && exp.highlights.length > 0 && (
              <ul className="text-xs sm:text-sm mt-2 list-disc list-inside">
                {exp.highlights.slice(0, 3).map((h, i) => (
                  <li key={i} className="text-muted-foreground">
                    {h}
                  </li>
                ))}
                {exp.highlights.length > 3 && (
                  <li className="text-muted-foreground">
                    {t('more', { count: exp.highlights.length - 3 })}
                  </li>
                )}
              </ul>
            )}
          </div>
        ))
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editIndex !== null ? t('experience.editTitle') : t('experience.addTitle')}
            </DialogTitle>
            <DialogDescription>
              {t('experience.dialogDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">{t('experience.jobTitle')}</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder={t('experience.jobTitlePlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">{t('experience.company')}</Label>
                <Input
                  id="company"
                  value={formData.company}
                  onChange={(e) =>
                    setFormData({ ...formData, company: e.target.value })
                  }
                  placeholder={t('experience.companyPlaceholder')}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">{t('experience.location')}</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
                placeholder={t('experience.locationPlaceholder')}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startDate">{t('experience.startDate')}</Label>
                <Input
                  id="startDate"
                  type="month"
                  value={formData.startDate}
                  onChange={(e) =>
                    setFormData({ ...formData, startDate: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">{t('experience.endDate')}</Label>
                <Input
                  id="endDate"
                  type="month"
                  value={formData.endDate}
                  onChange={(e) =>
                    setFormData({ ...formData, endDate: e.target.value })
                  }
                  placeholder={t('experience.endDateHint')}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t('experience.description')}</Label>
              <Textarea
                id="description"
                className="min-h-[80px]"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder={t('experience.descriptionPlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="highlights">{t('experience.highlights')}</Label>
              <Textarea
                id="highlights"
                className="min-h-[100px]"
                value={formData.highlights}
                onChange={(e) =>
                  setFormData({ ...formData, highlights: e.target.value })
                }
                placeholder={t('experience.highlightsPlaceholder')}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button
              onClick={handleSaveItem}
              disabled={!formData.title || !formData.company || isLoading}
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
