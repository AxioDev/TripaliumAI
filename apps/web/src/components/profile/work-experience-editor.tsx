'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
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
import { WorkExperience } from '@/lib/api-client';
import { Plus, Pencil, Trash2, GripVertical, Loader2 } from 'lucide-react';

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
  const [localExperiences, setLocalExperiences] = useState(experiences);
  const [hasChanges, setHasChanges] = useState(false);

  const openAddDialog = () => {
    setEditIndex(null);
    setFormData(emptyForm);
    setIsDialogOpen(true);
  };

  const openEditDialog = (index: number) => {
    const exp = localExperiences[index];
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

  const handleSaveItem = () => {
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

    if (editIndex !== null) {
      const updated = [...localExperiences];
      updated[editIndex] = { ...updated[editIndex], ...newExp };
      setLocalExperiences(updated);
    } else {
      setLocalExperiences([...localExperiences, newExp as WorkExperience]);
    }

    setHasChanges(true);
    setIsDialogOpen(false);
  };

  const handleDelete = (index: number) => {
    setLocalExperiences(localExperiences.filter((_, i) => i !== index));
    setHasChanges(true);
  };

  const handleSaveAll = async () => {
    await onSave(
      localExperiences.map((exp) => ({
        company: exp.company,
        title: exp.title,
        location: exp.location,
        startDate: exp.startDate,
        endDate: exp.endDate,
        description: exp.description,
        highlights: exp.highlights,
      }))
    );
    setHasChanges(false);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return t('present');
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{t('experience.title')}</CardTitle>
          <CardDescription>
            {t('experience.count', { count: localExperiences.length })}
          </CardDescription>
        </div>
        <Button onClick={openAddDialog} size="sm">
          <Plus className="h-4 w-4 mr-1" /> {t('add')}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {localExperiences.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t('experience.empty')}
          </p>
        ) : (
          localExperiences.map((exp, index) => (
            <div
              key={exp.id || index}
              className="flex items-start gap-4 p-4 border rounded-lg"
            >
              <GripVertical className="h-5 w-5 text-muted-foreground mt-1 cursor-move" />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium">{exp.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {exp.company}
                      {exp.location && ` - ${exp.location}`}
                    </p>
                  </div>
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    {formatDate(exp.startDate)} - {formatDate(exp.endDate)}
                  </span>
                </div>
                {exp.description && (
                  <p className="text-sm mt-2">{exp.description}</p>
                )}
                {exp.highlights && exp.highlights.length > 0 && (
                  <ul className="text-sm mt-2 list-disc list-inside">
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
      </CardContent>

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
              <textarea
                id="description"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder={t('experience.descriptionPlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="highlights">{t('experience.highlights')}</Label>
              <textarea
                id="highlights"
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
              disabled={!formData.title || !formData.company}
            >
              {editIndex !== null ? t('update') : t('add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
