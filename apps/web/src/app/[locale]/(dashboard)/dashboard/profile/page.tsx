'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { profileApi, cvApi, Profile, CV } from '@/lib/api-client';
import { useApi, useMutation } from '@/hooks/use-api';
import {
  Loader2,
  User,
  Briefcase,
  GraduationCap,
  Wrench,
  FileText,
  ChevronDown,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { WorkExperienceEditor } from '@/components/profile/work-experience-editor';
import { EducationEditor } from '@/components/profile/education-editor';
import { SkillsEditor } from '@/components/profile/skills-editor';
import { ProfileReadinessInline } from '@/components/profile/profile-readiness';
import { CVManager } from '@/components/profile/cv-manager';
import { cn } from '@/lib/utils';

function ProfileSection({
  id,
  icon,
  title,
  subtitle,
  badge,
  children,
  defaultOpen = true,
}: {
  id: string;
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <section id={id} className="scroll-mt-6">
      <Card>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex w-full items-center justify-between p-6 text-left"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              {icon}
            </div>
            <div>
              <h2 className="text-lg font-semibold">{title}</h2>
              {subtitle && (
                <p className="text-sm text-muted-foreground">{subtitle}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {badge}
            <ChevronDown
              className={cn(
                'h-5 w-5 text-muted-foreground transition-transform',
                isOpen && 'rotate-180'
              )}
            />
          </div>
        </button>
        {isOpen && <CardContent className="pt-0">{children}</CardContent>}
      </Card>
    </section>
  );
}

export default function ProfilePage() {
  const { toast } = useToast();
  const t = useTranslations('profile');
  const tCvs = useTranslations('cvs');

  // Fetch profile
  const {
    data: profile,
    isLoading,
    error,
    mutate: setProfile,
    refetch,
  } = useApi(() => profileApi.get(), {
    onError: (err) => {
      if (err.status !== 404) {
        toast({
          title: t('toast.error.title'),
          description: t('error.loadFailed'),
          variant: 'destructive',
        });
      }
    },
  });

  // Fetch CVs for import banner
  const { data: cvs } = useApi(() => cvApi.list(), {});

  // Local form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    location: '',
    linkedIn: '',
    website: '',
    summary: '',
    motivationText: '',
  });

  // Track original data for dirty checking
  const [originalData, setOriginalData] = useState(formData);
  const [personalDirty, setPersonalDirty] = useState(false);

  // Sync profile data to form
  useEffect(() => {
    if (profile) {
      const synced = {
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        email: profile.email || '',
        phone: profile.phone || '',
        location: profile.location || '',
        linkedIn: profile.linkedIn || '',
        website: profile.website || '',
        summary: profile.summary || '',
        motivationText: profile.motivationText || '',
      };
      setFormData(synced);
      setOriginalData(synced);
      setPersonalDirty(false);
    }
  }, [profile]);

  // Update mutation
  const updateMutation = useMutation(
    (data: Partial<Profile>) => profileApi.update(data),
    {
      onSuccess: (updatedProfile) => {
        setProfile(updatedProfile);
        setPersonalDirty(false);
        toast({
          title: t('toast.updated.title'),
          description: t('toast.updated.description'),
        });
      },
      onError: () => {
        toast({
          title: t('toast.error.title'),
          description: t('toast.error.updateFailed'),
          variant: 'destructive',
        });
      },
    }
  );

  // Work experience mutation
  const experiencesMutation = useMutation(
    (experiences: Parameters<typeof profileApi.updateExperiences>[0]) =>
      profileApi.updateExperiences(experiences),
    {
      onSuccess: () => {
        refetch();
        toast({
          title: t('toast.experienceUpdated.title'),
          description: t('toast.experienceUpdated.description'),
        });
      },
      onError: () => {
        toast({
          title: t('toast.error.title'),
          description: t('toast.error.experienceFailed'),
          variant: 'destructive',
        });
      },
    }
  );

  // Education mutation
  const educationMutation = useMutation(
    (educations: Parameters<typeof profileApi.updateEducation>[0]) =>
      profileApi.updateEducation(educations),
    {
      onSuccess: () => {
        refetch();
        toast({
          title: t('toast.educationUpdated.title'),
          description: t('toast.educationUpdated.description'),
        });
      },
      onError: () => {
        toast({
          title: t('toast.error.title'),
          description: t('toast.error.educationFailed'),
          variant: 'destructive',
        });
      },
    }
  );

  // Skills mutation
  const skillsMutation = useMutation(
    (skills: Parameters<typeof profileApi.updateSkills>[0]) =>
      profileApi.updateSkills(skills),
    {
      onSuccess: () => {
        refetch();
        toast({
          title: t('toast.skillsUpdated.title'),
          description: t('toast.skillsUpdated.description'),
        });
      },
      onError: () => {
        toast({
          title: t('toast.error.title'),
          description: t('toast.error.skillsFailed'),
          variant: 'destructive',
        });
      },
    }
  );

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    await updateMutation.mutate(formData);
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      // Check if actually different from original
      setPersonalDirty(JSON.stringify(updated) !== JSON.stringify(originalData));
      return updated;
    });
  };

  const handleDiscardPersonal = () => {
    setFormData(originalData);
    setPersonalDirty(false);
  };

  // Hash-based navigation on mount
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash) {
      // Small delay to ensure DOM is rendered
      setTimeout(() => {
        const el = document.getElementById(hash);
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, []);

  // Scroll to section helper
  const scrollToSection = useCallback((sectionId: string) => {
    const el = document.getElementById(sectionId);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  // beforeunload guard
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (personalDirty) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [personalDirty]);

  // Import from CV
  const handleImportFromCV = async () => {
    const baselineCv = cvs?.find((cv: CV) => cv.isBaseline && cv.parsingStatus === 'COMPLETED');
    const completedCv = baselineCv || cvs?.find((cv: CV) => cv.parsingStatus === 'COMPLETED');
    if (!completedCv) return;

    try {
      const data = await cvApi.getParsedData(completedCv.id);
      if (!data) return;

      const updates: Partial<typeof formData> = {};
      if (!formData.firstName && data.personalInfo?.firstName) updates.firstName = data.personalInfo.firstName;
      if (!formData.lastName && data.personalInfo?.lastName) updates.lastName = data.personalInfo.lastName;
      if (!formData.email && data.personalInfo?.email) updates.email = data.personalInfo.email;
      if (!formData.phone && data.personalInfo?.phone) updates.phone = data.personalInfo.phone;
      if (!formData.location && data.personalInfo?.location) updates.location = data.personalInfo.location;
      if (!formData.linkedIn && data.personalInfo?.linkedIn) updates.linkedIn = data.personalInfo.linkedIn;
      if (!formData.website && data.personalInfo?.website) updates.website = data.personalInfo.website;
      if (!formData.summary && data.summary) updates.summary = data.summary;

      if (Object.keys(updates).length > 0) {
        const newData = { ...formData, ...updates };
        setFormData(newData);
        setPersonalDirty(JSON.stringify(newData) !== JSON.stringify(originalData));
        toast({
          title: t('importBanner.title'),
          description: t('toast.updated.description'),
        });
      }
    } catch {
      toast({
        title: t('toast.error.title'),
        description: t('error.loadFailed'),
        variant: 'destructive',
      });
    }
  };

  // Compute badges
  const personalComplete = !!(formData.firstName && formData.lastName && formData.email);
  const experienceCount = profile?.workExperiences?.length || 0;
  const educationCount = profile?.educations?.length || 0;
  const skillCount = profile?.skills?.length || 0;
  const cvCount = cvs?.length || 0;

  // Check if import banner should show
  const hasCompletedCv = cvs?.some((cv: CV) => cv.parsingStatus === 'COMPLETED');
  const profileSparse = !formData.firstName || !formData.summary || experienceCount === 0 || skillCount < 3;
  const showImportBanner = hasCompletedCv && profileSparse;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && error.status !== 404 && !profile) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">{t('error.loadFailed')}</p>
        <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
          {t('toast.error.title')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with inline readiness */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">{t('title')}</h1>
          <p className="text-sm text-muted-foreground md:text-base">
            {t('subtitle')}
          </p>
        </div>
        <ProfileReadinessInline
          profile={profile ?? null}
          onScrollTo={scrollToSection}
        />
      </div>

      {/* Import from CV banner */}
      {showImportBanner && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">{t('importBanner.title')}</p>
                <p className="text-sm text-muted-foreground">
                  {t('importBanner.subtitle')}
                </p>
              </div>
            </div>
            <Button size="sm" onClick={handleImportFromCV}>
              {t('importBanner.action')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Personal Information Section */}
      <ProfileSection
        id="personal"
        icon={<User className="h-5 w-5 text-primary" />}
        title={t('sections.personal')}
        subtitle={t('sections.personalSubtitle')}
        badge={
          personalComplete ? (
            <CheckCircle2 className="h-5 w-5 text-success" />
          ) : null
        }
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          <div className="space-y-6">
            {/* Identity */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">{t('personalInfo.firstName')}</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => handleChange('firstName', e.target.value)}
                  placeholder={t('personalInfo.firstNamePlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">{t('personalInfo.lastName')}</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => handleChange('lastName', e.target.value)}
                  placeholder={t('personalInfo.lastNamePlaceholder')}
                />
              </div>
            </div>

            {/* Contact */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">{t('personalInfo.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder={t('personalInfo.emailPlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">{t('personalInfo.phone')}</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder={t('personalInfo.phonePlaceholder')}
                />
              </div>
            </div>

            {/* Location & Links */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="location">{t('personalInfo.location')}</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => handleChange('location', e.target.value)}
                  placeholder={t('personalInfo.locationPlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="linkedIn">{t('personalInfo.linkedIn')}</Label>
                <Input
                  id="linkedIn"
                  value={formData.linkedIn}
                  onChange={(e) => handleChange('linkedIn', e.target.value)}
                  placeholder={t('personalInfo.linkedInPlaceholder')}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">{t('personalInfo.website')}</Label>
              <Input
                id="website"
                value={formData.website}
                onChange={(e) => handleChange('website', e.target.value)}
                placeholder={t('personalInfo.websitePlaceholder')}
              />
            </div>

            {/* Separator */}
            <div className="border-t" />

            {/* Summary */}
            <div className="space-y-2">
              <Label>{t('summary.title')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('summary.subtitle')}
              </p>
              <Textarea
                value={formData.summary}
                onChange={(e) => handleChange('summary', e.target.value)}
                placeholder={t('summary.placeholder')}
                className="min-h-[120px]"
              />
            </div>

            {/* Motivation */}
            <div className="space-y-2">
              <Label>{t('motivation.title')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('motivation.subtitle')}
              </p>
              <Textarea
                value={formData.motivationText}
                onChange={(e) => handleChange('motivationText', e.target.value)}
                placeholder={t('motivation.placeholder')}
                className="min-h-[120px]"
              />
            </div>

            {/* Section-level save */}
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={updateMutation.isLoading || !personalDirty}
              >
                {updateMutation.isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('saving')}
                  </>
                ) : (
                  t('saveProfile')
                )}
              </Button>
            </div>
          </div>
        </form>
      </ProfileSection>

      {/* Work Experience Section */}
      <ProfileSection
        id="experience"
        icon={<Briefcase className="h-5 w-5 text-primary" />}
        title={t('sections.experience')}
        subtitle={t('sections.experienceSubtitle')}
        badge={
          experienceCount > 0 ? (
            <Badge variant="secondary">
              {t('experience.count', { count: experienceCount })}
            </Badge>
          ) : null
        }
      >
        <WorkExperienceEditor
          experiences={profile?.workExperiences || []}
          onSave={async (experiences) => {
            await experiencesMutation.mutateAsync(experiences);
          }}
          isLoading={experiencesMutation.isLoading}
        />
      </ProfileSection>

      {/* Education Section */}
      <ProfileSection
        id="education"
        icon={<GraduationCap className="h-5 w-5 text-primary" />}
        title={t('sections.education')}
        subtitle={t('sections.educationSubtitle')}
        badge={
          educationCount > 0 ? (
            <Badge variant="secondary">
              {t('education.count', { count: educationCount })}
            </Badge>
          ) : null
        }
      >
        <EducationEditor
          educations={profile?.educations || []}
          onSave={async (educations) => {
            await educationMutation.mutateAsync(educations);
          }}
          isLoading={educationMutation.isLoading}
        />
      </ProfileSection>

      {/* Skills Section */}
      <ProfileSection
        id="skills"
        icon={<Wrench className="h-5 w-5 text-primary" />}
        title={t('sections.skills')}
        subtitle={t('sections.skillsSubtitle')}
        badge={
          skillCount > 0 ? (
            <Badge variant="secondary">
              {t('skills.count', { count: skillCount })}
            </Badge>
          ) : null
        }
      >
        <SkillsEditor
          skills={profile?.skills || []}
          onSave={async (skills) => {
            await skillsMutation.mutateAsync(skills);
          }}
          isLoading={skillsMutation.isLoading}
        />
      </ProfileSection>

      {/* Documents Section */}
      <ProfileSection
        id="documents"
        icon={<FileText className="h-5 w-5 text-primary" />}
        title={t('sections.documents')}
        subtitle={t('sections.documentsSubtitle')}
        badge={
          cvCount > 0 ? (
            <Badge variant="secondary">
              {cvCount} {cvCount === 1 ? 'CV' : 'CVs'}
            </Badge>
          ) : null
        }
      >
        <CVManager />
      </ProfileSection>

      {/* Sticky save bar for personal info */}
      {personalDirty && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-4 py-3 md:left-64">
          <div className="mx-auto max-w-7xl flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {t('unsavedChanges')}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleDiscardPersonal}>
                {t('discard')}
              </Button>
              <Button size="sm" onClick={() => handleSubmit()} disabled={updateMutation.isLoading}>
                {updateMutation.isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('saving')}
                  </>
                ) : (
                  t('saveAll')
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom padding when sticky bar is visible */}
      {personalDirty && <div className="h-16" />}
    </div>
  );
}
