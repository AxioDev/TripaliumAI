'use client';

import { useState, useEffect } from 'react';
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { profileApi, Profile } from '@/lib/api-client';
import { useApi, useMutation } from '@/hooks/use-api';
import { Loader2, User, Briefcase, GraduationCap, Wrench } from 'lucide-react';
import { WorkExperienceEditor } from '@/components/profile/work-experience-editor';
import { EducationEditor } from '@/components/profile/education-editor';
import { SkillsEditor } from '@/components/profile/skills-editor';
import { ProfileReadiness } from '@/components/profile/profile-readiness';

export default function ProfilePage() {
  const { toast } = useToast();
  const t = useTranslations('profile');

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

  // Sync profile data to form
  useEffect(() => {
    if (profile) {
      setFormData({
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        email: profile.email || '',
        phone: profile.phone || '',
        location: profile.location || '',
        linkedIn: profile.linkedIn || '',
        website: profile.website || '',
        summary: profile.summary || '',
        motivationText: profile.motivationText || '',
      });
    }
  }, [profile]);

  // Update mutation
  const updateMutation = useMutation(
    (data: Partial<Profile>) => profileApi.update(data),
    {
      onSuccess: (updatedProfile) => {
        setProfile(updatedProfile);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateMutation.mutate(formData);
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

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
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">{t('title')}</h1>
        <p className="text-sm text-muted-foreground md:text-base">
          {t('subtitle')}
        </p>
      </div>

      {/* Profile Readiness Score */}
      <ProfileReadiness profile={profile ?? null} compact />

      <Tabs defaultValue="personal" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-[400px]">
          <TabsTrigger value="personal" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">{t('tabs.personal')}</span>
          </TabsTrigger>
          <TabsTrigger value="experience" className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            <span className="hidden sm:inline">{t('tabs.experience')}</span>
          </TabsTrigger>
          <TabsTrigger value="education" className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            <span className="hidden sm:inline">{t('tabs.education')}</span>
          </TabsTrigger>
          <TabsTrigger value="skills" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            <span className="hidden sm:inline">{t('tabs.skills')}</span>
          </TabsTrigger>
        </TabsList>

        {/* Personal Information Tab */}
        <TabsContent value="personal">
          <form onSubmit={handleSubmit}>
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t('personalInfo.title')}</CardTitle>
                  <CardDescription>
                    {t('personalInfo.subtitle')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
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
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t('summary.title')}</CardTitle>
                  <CardDescription>
                    {t('summary.subtitle')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <textarea
                    className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder={t('summary.placeholder')}
                    value={formData.summary}
                    onChange={(e) => handleChange('summary', e.target.value)}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t('motivation.title')}</CardTitle>
                  <CardDescription>
                    {t('motivation.subtitle')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <textarea
                    className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder={t('motivation.placeholder')}
                    value={formData.motivationText}
                    onChange={(e) => handleChange('motivationText', e.target.value)}
                  />
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button type="submit" disabled={updateMutation.isLoading}>
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
        </TabsContent>

        {/* Work Experience Tab */}
        <TabsContent value="experience">
          <WorkExperienceEditor
            experiences={profile?.workExperiences || []}
            onSave={async (experiences) => {
              await experiencesMutation.mutateAsync(experiences);
            }}
            isLoading={experiencesMutation.isLoading}
          />
        </TabsContent>

        {/* Education Tab */}
        <TabsContent value="education">
          <EducationEditor
            educations={profile?.educations || []}
            onSave={async (educations) => {
              await educationMutation.mutateAsync(educations);
            }}
            isLoading={educationMutation.isLoading}
          />
        </TabsContent>

        {/* Skills Tab */}
        <TabsContent value="skills">
          <SkillsEditor
            skills={profile?.skills || []}
            onSave={async (skills) => {
              await skillsMutation.mutateAsync(skills);
            }}
            isLoading={skillsMutation.isLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
