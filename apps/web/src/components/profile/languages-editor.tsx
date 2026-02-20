'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import { Language } from '@/lib/api-client';
import { Plus, X, Languages } from 'lucide-react';

interface LanguagesEditorProps {
  languages: Language[];
  onSave: (languages: Omit<Language, 'id'>[]) => Promise<void>;
  isLoading?: boolean;
}

const proficiencyKeys = ['native', 'fluent', 'advanced', 'intermediate', 'basic'] as const;

function getProficiencyVariant(proficiency: string): 'default' | 'secondary' | 'outline' {
  const lower = proficiency.toLowerCase();
  if (lower === 'native' || lower === 'fluent') return 'default';
  if (lower === 'advanced' || lower === 'intermediate') return 'secondary';
  return 'outline';
}

export function LanguagesEditor({ languages, onSave, isLoading }: LanguagesEditorProps) {
  const t = useTranslations('profile');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [proficiency, setProficiency] = useState('');
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  const toPayload = (langs: Language[]): Omit<Language, 'id'>[] =>
    langs.map((l) => ({ name: l.name, proficiency: l.proficiency }));

  const handleAdd = async () => {
    if (!name.trim() || !proficiency) return;
    const updated = [...languages, { name: name.trim(), proficiency } as Language];
    setName('');
    setProficiency('');
    setIsDialogOpen(false);
    await onSave(toPayload(updated));
  };

  const handleDelete = async (index: number) => {
    setDeleteIndex(null);
    const updated = languages.filter((_, i) => i !== index);
    await onSave(toPayload(updated));
  };

  const getProficiencyLabel = (prof: string): string => {
    const key = proficiencyKeys.find(
      (k) => k === prof.toLowerCase() || t(`languages.proficiencies.${k}`) === prof
    );
    return key ? t(`languages.proficiencies.${key}`) : prof;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {t('languages.count', { count: languages.length })}
        </p>
        <Button onClick={() => setIsDialogOpen(true)} size="sm" disabled={isLoading}>
          <Plus className="h-4 w-4 mr-1" /> {t('add')}
        </Button>
      </div>

      {languages.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 px-4 border border-dashed rounded-lg">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
            <Languages className="h-6 w-6 text-muted-foreground" />
          </div>
          <h4 className="text-sm font-medium mb-1">{t('languages.emptyTitle')}</h4>
          <p className="text-xs text-muted-foreground text-center max-w-xs mb-1">
            {t('languages.emptyDescription')}
          </p>
          <p className="text-xs text-success font-medium">{t('languages.emptyBoost')}</p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {languages.map((lang, index) => (
            <div
              key={lang.id || index}
              className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 group hover:border-destructive/50"
            >
              <span className="text-sm font-medium">{lang.name}</span>
              <Badge variant={getProficiencyVariant(lang.proficiency)}>
                {getProficiencyLabel(lang.proficiency)}
              </Badge>
              <button
                onClick={() => setDeleteIndex(index)}
                disabled={isLoading}
                className="ml-0.5 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                style={{ opacity: undefined }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('languages.addTitle')}</DialogTitle>
            <DialogDescription>
              {t('languages.dialogDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="langName">{t('languages.name')}</Label>
              <Input
                id="langName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('languages.namePlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="proficiency">{t('languages.proficiency')}</Label>
              <Select value={proficiency} onValueChange={setProficiency}>
                <SelectTrigger>
                  <SelectValue placeholder={t('languages.proficiencyPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {proficiencyKeys.map((key) => (
                    <SelectItem key={key} value={key}>
                      {t(`languages.proficiencies.${key}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleAdd} disabled={!name.trim() || !proficiency || isLoading}>
              {t('add')}
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
