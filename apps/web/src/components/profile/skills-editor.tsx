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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skill } from '@/lib/api-client';
import { Plus, X } from 'lucide-react';

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

const skillLevels = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
const skillCategories = [
  'Programming Languages',
  'Frameworks',
  'Databases',
  'DevOps',
  'Cloud',
  'Tools',
  'Soft Skills',
  'Languages',
  'Other',
];

export function SkillsEditor({ skills, onSave, isLoading }: SkillsEditorProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<SkillFormData>(emptyForm);
  const [localSkills, setLocalSkills] = useState(skills);
  const [hasChanges, setHasChanges] = useState(false);

  const handleAddSkill = () => {
    if (!formData.name.trim()) return;

    const newSkill: Omit<Skill, 'id'> = {
      name: formData.name.trim(),
      category: formData.category || null,
      level: formData.level || null,
      yearsOfExp: formData.yearsOfExp ? parseInt(formData.yearsOfExp) : null,
    };

    setLocalSkills([...localSkills, newSkill as Skill]);
    setFormData(emptyForm);
    setHasChanges(true);
    setIsDialogOpen(false);
  };

  const handleRemoveSkill = (index: number) => {
    setLocalSkills(localSkills.filter((_, i) => i !== index));
    setHasChanges(true);
  };

  const handleSaveAll = async () => {
    await onSave(
      localSkills.map((skill) => ({
        name: skill.name,
        category: skill.category,
        level: skill.level,
        yearsOfExp: skill.yearsOfExp,
      }))
    );
    setHasChanges(false);
  };

  // Group skills by category
  const groupedSkills = localSkills.reduce(
    (acc, skill) => {
      const cat = skill.category || 'Other';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(skill);
      return acc;
    },
    {} as Record<string, Skill[]>
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Skills</CardTitle>
          <CardDescription>{localSkills.length} skill(s)</CardDescription>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {localSkills.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No skills added. Upload a CV to extract your skills or add manually.
          </p>
        ) : (
          Object.entries(groupedSkills).map(([category, categorySkills]) => (
            <div key={category}>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">
                {category}
              </h4>
              <div className="flex flex-wrap gap-2">
                {categorySkills.map((skill, index) => {
                  const globalIndex = localSkills.indexOf(skill);
                  return (
                    <span
                      key={skill.id || index}
                      className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm group hover:border-destructive"
                    >
                      {skill.name}
                      {skill.level && (
                        <span className="text-muted-foreground text-xs">
                          ({skill.level})
                        </span>
                      )}
                      <button
                        onClick={() => handleRemoveSkill(globalIndex)}
                        className="ml-1 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
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

        {hasChanges && (
          <div className="flex justify-end pt-4 border-t">
            <Button onClick={handleSaveAll} disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        )}
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Skill</DialogTitle>
            <DialogDescription>
              Add a new skill to your profile
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Skill Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., React, Python, Project Management"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData({ ...formData, category: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {skillCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="level">Proficiency Level</Label>
                <Select
                  value={formData.level}
                  onValueChange={(value) =>
                    setFormData({ ...formData, level: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    {skillLevels.map((level) => (
                      <SelectItem key={level} value={level}>
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="yearsOfExp">Years of Experience</Label>
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
              Cancel
            </Button>
            <Button onClick={handleAddSkill} disabled={!formData.name.trim()}>
              Add Skill
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
