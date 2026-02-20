'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skill } from '@/lib/api-client';
import { Plus, X, Wrench, Pencil, Check } from 'lucide-react';

interface SkillsEditorProps {
  skills: Skill[];
  onSave: (skills: Omit<Skill, 'id'>[]) => Promise<void>;
  isLoading?: boolean;
}

interface SkillFormData {
  name: string;
  category: string;
  level: string;
  yearsOfExp: string;
}

const emptyForm: SkillFormData = {
  name: '',
  category: '',
  level: '',
  yearsOfExp: '',
};

const skillLevelKeys = ['beginner', 'intermediate', 'advanced', 'expert'] as const;
const skillCategoryKeys = [
  'programmingLanguages',
  'frameworks',
  'databases',
  'devops',
  'cloud',
  'tools',
  'softSkills',
  'languages',
  'other',
] as const;

export function SkillsEditor({ skills, onSave, isLoading }: SkillsEditorProps) {
  const t = useTranslations('profile');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<SkillFormData>(emptyForm);
  const [isEditMode, setIsEditMode] = useState(false);

  const toPayload = (s: Skill[]): Omit<Skill, 'id'>[] =>
    s.map((skill) => ({
      name: skill.name,
      category: skill.category,
      level: skill.level,
      yearsOfExp: skill.yearsOfExp,
    }));

  const handleAddSkill = async () => {
    if (!formData.name.trim()) return;

    const newSkill: Omit<Skill, 'id'> = {
      name: formData.name.trim(),
      category: formData.category || null,
      level: formData.level || null,
      yearsOfExp: formData.yearsOfExp ? parseInt(formData.yearsOfExp) : null,
    };

    const updated = [...skills, newSkill as Skill];
    setFormData(emptyForm);
    setIsDialogOpen(false);
    await onSave(toPayload(updated));
  };

  const handleRemoveSkill = async (index: number) => {
    const updated = skills.filter((_, i) => i !== index);
    await onSave(toPayload(updated));
  };

  // Get translated category name
  const getCategoryLabel = (category: string | null): string => {
    if (!category) return t('skills.categories.other');
    const key = skillCategoryKeys.find(
      (k) => t(`skills.categories.${k}`) === category || k === category.toLowerCase().replace(/\s/g, '')
    );
    return key ? t(`skills.categories.${key}`) : category;
  };

  // Get translated level name
  const getLevelLabel = (level: string | null): string => {
    if (!level) return '';
    const key = skillLevelKeys.find(
      (k) => t(`skills.levels.${k}`) === level || k === level.toLowerCase()
    );
    return key ? t(`skills.levels.${key}`) : level;
  };

  // Group skills by category
  const groupedSkills = skills.reduce(
    (acc, skill) => {
      const cat = skill.category || 'other';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(skill);
      return acc;
    },
    {} as Record<string, Skill[]>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {t('skills.count', { count: skills.length })}
        </p>
        <div className="flex gap-2">
          {skills.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditMode(!isEditMode)}
            >
              {isEditMode ? (
                <><Check className="h-4 w-4 mr-1" /> {t('skills.doneEditing')}</>
              ) : (
                <><Pencil className="h-4 w-4 mr-1" /> {t('skills.editMode')}</>
              )}
            </Button>
          )}
          <Button onClick={() => setIsDialogOpen(true)} size="sm" disabled={isLoading}>
            <Plus className="h-4 w-4 mr-1" /> {t('add')}
          </Button>
        </div>
      </div>

      {skills.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 px-4 border border-dashed rounded-lg">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
            <Wrench className="h-6 w-6 text-muted-foreground" />
          </div>
          <h4 className="text-sm font-medium mb-1">{t('skills.emptyTitle')}</h4>
          <p className="text-xs text-muted-foreground text-center max-w-xs mb-1">
            {t('skills.emptyDescription')}
          </p>
          <p className="text-xs text-success font-medium">{t('skills.emptyBoost')}</p>
        </div>
      ) : (
        Object.entries(groupedSkills).map(([category, categorySkills]) => (
          <div key={category}>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">
              {getCategoryLabel(category)}
            </h4>
            <div className="flex flex-wrap gap-2">
              {categorySkills.map((skill, index) => {
                const globalIndex = skills.indexOf(skill);
                return (
                  <span
                    key={skill.id || index}
                    className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm ${
                      isEditMode ? 'border-destructive/50 pr-1.5' : 'group hover:border-destructive'
                    }`}
                  >
                    {skill.name}
                    {skill.level && (
                      <span className="text-muted-foreground text-xs">
                        ({getLevelLabel(skill.level)})
                      </span>
                    )}
                    <button
                      onClick={() => handleRemoveSkill(globalIndex)}
                      disabled={isLoading}
                      className={`ml-1 text-destructive hover:text-destructive ${
                        isEditMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                );
              })}
            </div>
          </div>
        ))
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('skills.addTitle')}</DialogTitle>
            <DialogDescription>
              {t('skills.dialogDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('skills.name')}</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder={t('skills.namePlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">{t('skills.category')}</Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData({ ...formData, category: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('skills.categoryPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {skillCategoryKeys.map((key) => (
                    <SelectItem key={key} value={key}>
                      {t(`skills.categories.${key}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="level">{t('skills.level')}</Label>
                <Select
                  value={formData.level}
                  onValueChange={(value) =>
                    setFormData({ ...formData, level: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('skills.levelPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {skillLevelKeys.map((key) => (
                      <SelectItem key={key} value={key}>
                        {t(`skills.levels.${key}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="yearsOfExp">{t('skills.yearsOfExp')}</Label>
                <Input
                  id="yearsOfExp"
                  type="number"
                  min="0"
                  max="50"
                  value={formData.yearsOfExp}
                  onChange={(e) =>
                    setFormData({ ...formData, yearsOfExp: e.target.value })
                  }
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleAddSkill} disabled={!formData.name.trim() || isLoading}>
              {t('skills.addSkill')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
