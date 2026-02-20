'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
import { AnimatedCheckmark } from '@/components/ui/animated-checkmark';
import { profileApi, cvApi, Profile, CV } from '@/lib/api-client';
import { useApi, useMutation } from '@/hooks/use-api';
import { useDebouncedCallback } from '@/hooks/use-debounce';
import {
  Loader2,
  User,
  Briefcase,
  GraduationCap,
  Wrench,
  FileText,
  Languages,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { WorkExperienceEditor } from '@/components/profile/work-experience-editor';
import { EducationEditor } from '@/components/profile/education-editor';
import { SkillsEditor } from '@/components/profile/skills-editor';
import { LanguagesEditor } from '@/components/profile/languages-editor';
import { ProfileReadinessInline, getSectionCompletion } from '@/components/profile/profile-readiness';
import { CVManager } from '@/components/profile/cv-manager';
import { cn } from '@/lib/utils';

// ------- Validation helpers -------
const validators: Record<string, (v: string) => boolean> = {
  email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
  phone: (v) => /^[+\d]/.test(v) && v.replace(/[\s\-()]/g, '').length >= 7,
  linkedIn: (v) => v.toLowerCase().includes('linkedin.com'),
  website: (v) => /^https?:\/\//i.test(v),
};

// ------- localStorage persistence -------
const SECTIONS_KEY = 'tripalium_profile_sections';

function loadSectionState(): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(SECTIONS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveSectionState(state: Record<string, boolean>) {
  try {
    localStorage.setItem(SECTIONS_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

// ------- ProfileSection -------
type SectionStatus = 'complete' | 'incomplete' | 'empty';

function ProfileSection({
  id,
  icon,
  title,
  subtitle,
  badge,
  children,
  defaultOpen = true,
  status = 'empty',
  highlighted = false,
  onToggle,
  isOpen: controlledIsOpen,
}: {
  id: string;
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  status?: SectionStatus;
  highlighted?: boolean;
  onToggle?: (id: string, open: boolean) => void;
  isOpen?: boolean;
}) {
  const isOpen = controlledIsOpen ?? defaultOpen;

  const iconContainerClass = {
    complete: 'bg-success/10',
    incomplete: 'bg-warning/10',
    empty: 'bg-primary/10',
  }[status];

  const iconClass = {
    complete: 'text-success',
    incomplete: 'text-warning',
    empty: 'text-primary',
  }[status];

  return (
    <section id={id} className={cn('scroll-mt-6 transition-all', highlighted && 'ring-2 ring-primary/30 rounded-lg')}>
      <Card>
        <button
          onClick={() => onToggle?.(id, !isOpen)}
          className="flex w-full items-center justify-between p-4 sm:p-6 text-left"
        >
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className={cn('flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg', iconContainerClass)}>
              <span className={iconClass}>{icon}</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-semibold truncate">{title}</h2>
                {status === 'complete' && (
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                )}
              </div>
              {subtitle && (
                <p className="hidden sm:block text-sm text-muted-foreground">{subtitle}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-2">
            {badge}
            <ChevronDown
              className={cn(
                'h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground transition-transform',
                isOpen && 'rotate-180'
              )}
            />
          </div>
        </button>
        {isOpen && <CardContent className="px-4 sm:px-6 pt-0">{children}</CardContent>}
      </Card>
    </section>
  );
}

// ------- Main page -------
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

  // Validation errors
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Auto-save status: 'idle' | 'saving' | 'saved' | 'error'
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const savedTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Track whether we have initial data loaded
  const [initialLoaded, setInitialLoaded] = useState(false);

  // Section collapse states (persisted)
  const [sectionStates, setSectionStates] = useState<Record<string, boolean>>({});

  // Section highlight
  const [highlightedSection, setHighlightedSection] = useState<string | null>(null);

  // Previous percentage for celebration
  const prevPercentageRef = useRef<number | null>(null);

  // Load section states from localStorage
  useEffect(() => {
    setSectionStates(loadSectionState());
  }, []);

  const handleSectionToggle = useCallback((id: string, open: boolean) => {
    setSectionStates((prev) => {
      const next = { ...prev, [id]: open };
      saveSectionState(next);
      return next;
    });
  }, []);

  const isSectionOpen = (id: string, defaultOpen = true) => {
    return sectionStates[id] ?? defaultOpen;
  };

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
      setInitialLoaded(true);
    }
  }, [profile]);

  // Auto-save mutation (silent - no toast)
  const autoSaveMutation = useMutation(
    (data: Partial<Profile>) => profileApi.update(data),
    {
      onSuccess: (updatedProfile) => {
        setProfile(updatedProfile);
        setSaveStatus('saved');
        if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
        savedTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000);
      },
      onError: () => {
        setSaveStatus('error');
      },
    }
  );

  // Debounced auto-save
  const [debouncedSave, cancelDebounce, isPending] = useDebouncedCallback(
    (data: Record<string, string>) => {
      // Validate before saving
      const errors: Record<string, string> = {};
      for (const [field, validate] of Object.entries(validators)) {
        if (data[field] && !validate(data[field])) {
          errors[field] = t(`validation.${field}`);
        }
      }
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        return;
      }
      setFieldErrors({});
      setSaveStatus('saving');
      autoSaveMutation.mutate(data as unknown as Partial<Profile>);
    },
    800
  );

  // beforeunload guard - only during debounce window
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isPending()) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isPending]);

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

  // Languages mutation
  const languagesMutation = useMutation(
    (languages: Parameters<typeof profileApi.updateLanguages>[0]) =>
      profileApi.updateLanguages(languages),
    {
      onSuccess: () => {
        refetch();
        toast({
          title: t('toast.languagesUpdated.title'),
          description: t('toast.languagesUpdated.description'),
        });
      },
      onError: () => {
        toast({
          title: t('toast.error.title'),
          description: t('toast.error.languagesFailed'),
          variant: 'destructive',
        });
      },
    }
  );

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      // Only trigger auto-save after initial data is loaded
      if (initialLoaded) {
        // Validate on change for this field
        if (value && validators[field] && !validators[field](value)) {
          setFieldErrors((prev) => ({ ...prev, [field]: t(`validation.${field}`) }));
        } else {
          setFieldErrors((prev) => {
            const next = { ...prev };
            delete next[field];
            return next;
          });
        }
        debouncedSave(updated);
      }
      return updated;
    });
  };

  const handleFieldBlur = (field: string) => {
    const value = formData[field as keyof typeof formData];
    if (value && validators[field] && !validators[field](value)) {
      setFieldErrors((prev) => ({ ...prev, [field]: t(`validation.${field}`) }));
    } else {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // Hash-based navigation on mount
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash) {
      setTimeout(() => {
        scrollToSection(hash);
      }, 100);
    }
  }, []);

  // Scroll to section helper with highlight
  const scrollToSection = useCallback((sectionId: string) => {
    // Auto-expand if collapsed
    setSectionStates((prev) => {
      if (prev[sectionId] === false) {
        const next = { ...prev, [sectionId]: true };
        saveSectionState(next);
        return next;
      }
      return prev;
    });

    // Highlight
    setHighlightedSection(sectionId);
    setTimeout(() => setHighlightedSection(null), 2000);

    // Scroll
    setTimeout(() => {
      const el = document.getElementById(sectionId);
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }, []);

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
        // Trigger auto-save for imported data
        setSaveStatus('saving');
        autoSaveMutation.mutate(newData as unknown as Partial<Profile>);

        toast({
          title: t('importBanner.title'),
          description: t('toast.updated.description'),
        });

        // Scroll to first imported section
        scrollToSection('personal');
      }
    } catch {
      toast({
        title: t('toast.error.title'),
        description: t('error.loadFailed'),
        variant: 'destructive',
      });
    }
  };

  // Compute section statuses
  const sectionCompletion = getSectionCompletion(profile ?? null);

  // Compute badges
  const experienceCount = profile?.workExperiences?.length || 0;
  const educationCount = profile?.educations?.length || 0;
  const skillCount = profile?.skills?.length || 0;
  const languageCount = profile?.languages?.length || 0;
  const cvCount = cvs?.length || 0;

  // Check if import banner should show
  const hasCompletedCv = cvs?.some((cv: CV) => cv.parsingStatus === 'COMPLETED');
  const profileSparse = !formData.firstName || !formData.summary || experienceCount === 0 || skillCount < 3;
  const showImportBanner = hasCompletedCv && profileSparse;

  // Celebration: detect 100% transition
  useEffect(() => {
    if (!profile) return;
    const completion = getSectionCompletion(profile);
    const allComplete = Object.values(completion).every((s) => s === 'complete');
    // Only celebrate if we previously weren't at 100%
    if (allComplete && prevPercentageRef.current !== null && !prevPercentageRef.current) {
      toast({
        title: (
          <span className="flex items-center gap-2">
            <AnimatedCheckmark size={18} />
            {t('celebration.title')}
          </span>
        ) as unknown as string,
        description: t('celebration.description'),
        variant: 'success',
      });
    }
    prevPercentageRef.current = allComplete ? 1 : 0;
  }, [profile, toast, t]);

  // Auto-save status indicator
  const saveStatusBadge = (() => {
    switch (saveStatus) {
      case 'saving':
        return (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            {t('autoSave.saving')}
          </span>
        );
      case 'saved':
        return (
          <span className="flex items-center gap-1 text-xs text-success">
            <CheckCircle2 className="h-3 w-3" />
            {t('autoSave.saved')}
          </span>
        );
      case 'error':
        return (
          <span className="flex items-center gap-1 text-xs text-destructive">
            <AlertCircle className="h-3 w-3" />
            {t('autoSave.error')}
          </span>
        );
      default:
        return null;
    }
  })();

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
    <div className="space-y-4 sm:space-y-6">
      {/* Header with inline readiness */}
      <div className="space-y-3 sm:space-y-4">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl md:text-3xl">{t('title')}</h1>
          <p className="text-xs text-muted-foreground sm:text-sm md:text-base">
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
          <CardContent className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium sm:text-base">{t('importBanner.title')}</p>
                  <p className="text-xs text-muted-foreground sm:text-sm">
                    {t('importBanner.subtitle')}
                  </p>
                </div>
              </div>
              <Button size="sm" onClick={handleImportFromCV} className="w-full sm:w-auto shrink-0">
                {t('importBanner.action')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Personal Information Section */}
      <ProfileSection
        id="personal"
        icon={<User className="h-5 w-5" />}
        title={t('sections.personal')}
        subtitle={t('sections.personalSubtitle')}
        status={sectionCompletion.personal}
        highlighted={highlightedSection === 'personal'}
        isOpen={isSectionOpen('personal')}
        onToggle={handleSectionToggle}
        badge={saveStatusBadge}
      >
        <div className="space-y-6">
          {/* Contact Details sub-group */}
          <div className="bg-muted/30 rounded-lg p-4 space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">{t('personalInfo.contactGroup')}</h3>
            {/* Identity */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">
                  {t('personalInfo.firstName')} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => handleChange('firstName', e.target.value)}
                  placeholder={t('personalInfo.firstNamePlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">
                  {t('personalInfo.lastName')} <span className="text-destructive">*</span>
                </Label>
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
                <Label htmlFor="email">
                  {t('personalInfo.email')} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  onBlur={() => handleFieldBlur('email')}
                  placeholder={t('personalInfo.emailPlaceholder')}
                  className={fieldErrors.email ? 'border-destructive' : ''}
                />
                {fieldErrors.email && (
                  <p className="text-xs text-destructive">{fieldErrors.email}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">{t('personalInfo.phone')}</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  onBlur={() => handleFieldBlur('phone')}
                  placeholder={t('personalInfo.phonePlaceholder')}
                  className={fieldErrors.phone ? 'border-destructive' : ''}
                />
                {fieldErrors.phone && (
                  <p className="text-xs text-destructive">{fieldErrors.phone}</p>
                )}
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
                  onBlur={() => handleFieldBlur('linkedIn')}
                  placeholder={t('personalInfo.linkedInPlaceholder')}
                  className={fieldErrors.linkedIn ? 'border-destructive' : ''}
                />
                {fieldErrors.linkedIn && (
                  <p className="text-xs text-destructive">{fieldErrors.linkedIn}</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">{t('personalInfo.website')}</Label>
              <Input
                id="website"
                value={formData.website}
                onChange={(e) => handleChange('website', e.target.value)}
                onBlur={() => handleFieldBlur('website')}
                placeholder={t('personalInfo.websitePlaceholder')}
                className={fieldErrors.website ? 'border-destructive' : ''}
              />
              {fieldErrors.website && (
                <p className="text-xs text-destructive">{fieldErrors.website}</p>
              )}
            </div>
          </div>

          {/* About You sub-group */}
          <div className="bg-muted/30 rounded-lg p-4 space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">{t('personalInfo.aboutGroup')}</h3>

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
          </div>
        </div>
      </ProfileSection>

      {/* Work Experience Section */}
      <ProfileSection
        id="experience"
        icon={<Briefcase className="h-5 w-5" />}
        title={t('sections.experience')}
        subtitle={t('sections.experienceSubtitle')}
        status={sectionCompletion.experience}
        highlighted={highlightedSection === 'experience'}
        isOpen={isSectionOpen('experience')}
        onToggle={handleSectionToggle}
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
        icon={<GraduationCap className="h-5 w-5" />}
        title={t('sections.education')}
        subtitle={t('sections.educationSubtitle')}
        status={sectionCompletion.education}
        highlighted={highlightedSection === 'education'}
        isOpen={isSectionOpen('education')}
        onToggle={handleSectionToggle}
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
        icon={<Wrench className="h-5 w-5" />}
        title={t('sections.skills')}
        subtitle={t('sections.skillsSubtitle')}
        status={sectionCompletion.skills}
        highlighted={highlightedSection === 'skills'}
        isOpen={isSectionOpen('skills')}
        onToggle={handleSectionToggle}
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

      {/* Languages Section */}
      <ProfileSection
        id="languages"
        icon={<Languages className="h-5 w-5" />}
        title={t('sections.languages')}
        subtitle={t('sections.languagesSubtitle')}
        status={sectionCompletion.languages}
        highlighted={highlightedSection === 'languages'}
        isOpen={isSectionOpen('languages')}
        onToggle={handleSectionToggle}
        badge={
          languageCount > 0 ? (
            <Badge variant="secondary">
              {t('languages.count', { count: languageCount })}
            </Badge>
          ) : null
        }
      >
        <LanguagesEditor
          languages={profile?.languages || []}
          onSave={async (languages) => {
            await languagesMutation.mutateAsync(languages);
          }}
          isLoading={languagesMutation.isLoading}
        />
      </ProfileSection>

      {/* Documents Section */}
      <ProfileSection
        id="documents"
        icon={<FileText className="h-5 w-5" />}
        title={t('sections.documents')}
        subtitle={t('sections.documentsSubtitle')}
        status={sectionCompletion.documents}
        highlighted={highlightedSection === 'documents'}
        isOpen={isSectionOpen('documents')}
        onToggle={handleSectionToggle}
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
    </div>
  );
}
