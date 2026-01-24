'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import {
  User,
  Target,
  Bell,
  Shield,
  Loader2,
  Save,
  Globe,
} from 'lucide-react';

export default function SettingsPage() {
  const { toast } = useToast();
  const { data: session } = useSession();
  const [saving, setSaving] = useState(false);
  const t = useTranslations('settings');

  // Campaign defaults
  const [defaultMatchThreshold, setDefaultMatchThreshold] = useState(60);
  const [defaultPracticeMode, setDefaultPracticeMode] = useState(true);
  const [defaultAutoApply, setDefaultAutoApply] = useState(false);
  const [defaultRemoteOk, setDefaultRemoteOk] = useState(true);

  // Notification preferences (for future use)
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [jobAlerts, setJobAlerts] = useState(true);
  const [applicationUpdates, setApplicationUpdates] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);

  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const handleSavePreferences = async () => {
    setSaving(true);
    // In a real app, this would save to the backend
    setTimeout(() => {
      setSaving(false);
      toast({
        title: t('toast.saved.title'),
        description: t('toast.saved.description'),
      });
    }, 500);
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: t('toast.error.title'),
        description: t('toast.error.passwordsNoMatch'),
        variant: 'destructive',
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: t('toast.error.title'),
        description: t('toast.error.passwordTooShort'),
        variant: 'destructive',
      });
      return;
    }

    setChangingPassword(true);
    // In a real app, this would call the backend
    setTimeout(() => {
      setChangingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast({
        title: t('toast.passwordUpdated.title'),
        description: t('toast.passwordUpdated.description'),
      });
    }, 500);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">{t('title')}</h1>
        <p className="text-sm text-muted-foreground md:text-base">
          {t('subtitle')}
        </p>
      </div>

      {/* Language */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            {t('language.title')}
          </CardTitle>
          <CardDescription>{t('language.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <LanguageSwitcher />
        </CardContent>
      </Card>

      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {t('account.title')}
          </CardTitle>
          <CardDescription>{t('account.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t('account.email')}</Label>
            <Input value={session?.user?.email || ''} disabled />
          </div>
        </CardContent>
      </Card>

      {/* Campaign Defaults */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            {t('campaignDefaults.title')}
          </CardTitle>
          <CardDescription>
            {t('campaignDefaults.subtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>{t('campaignDefaults.matchThreshold')}</Label>
                <span className="text-sm text-muted-foreground">{defaultMatchThreshold}%</span>
              </div>
              <Slider
                value={[defaultMatchThreshold]}
                onValueChange={(v) => setDefaultMatchThreshold(v[0])}
                min={0}
                max={100}
                step={5}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t('campaignDefaults.matchThresholdHint')}
              </p>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t('campaignDefaults.practiceMode')}</Label>
                <p className="text-xs text-muted-foreground">
                  {t('campaignDefaults.practiceModeHint')}
                </p>
              </div>
              <Switch
                checked={defaultPracticeMode}
                onCheckedChange={setDefaultPracticeMode}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t('campaignDefaults.autoApply')}</Label>
                <p className="text-xs text-muted-foreground">
                  {t('campaignDefaults.autoApplyHint')}
                </p>
              </div>
              <Switch
                checked={defaultAutoApply}
                onCheckedChange={setDefaultAutoApply}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t('campaignDefaults.remoteJobs')}</Label>
                <p className="text-xs text-muted-foreground">
                  {t('campaignDefaults.remoteJobsHint')}
                </p>
              </div>
              <Switch
                checked={defaultRemoteOk}
                onCheckedChange={setDefaultRemoteOk}
              />
            </div>
          </div>

          <div className="pt-2">
            <Button onClick={handleSavePreferences} disabled={saving}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {t('campaignDefaults.savePreferences')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {t('notifications.title')}
          </CardTitle>
          <CardDescription>
            {t('notifications.subtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t('notifications.email')}</Label>
              <p className="text-xs text-muted-foreground">
                {t('notifications.emailHint')}
              </p>
            </div>
            <Switch
              checked={emailNotifications}
              onCheckedChange={setEmailNotifications}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t('notifications.jobAlerts')}</Label>
              <p className="text-xs text-muted-foreground">
                {t('notifications.jobAlertsHint')}
              </p>
            </div>
            <Switch
              checked={jobAlerts}
              onCheckedChange={setJobAlerts}
              disabled={!emailNotifications}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t('notifications.applicationUpdates')}</Label>
              <p className="text-xs text-muted-foreground">
                {t('notifications.applicationUpdatesHint')}
              </p>
            </div>
            <Switch
              checked={applicationUpdates}
              onCheckedChange={setApplicationUpdates}
              disabled={!emailNotifications}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t('notifications.weeklyDigest')}</Label>
              <p className="text-xs text-muted-foreground">
                {t('notifications.weeklyDigestHint')}
              </p>
            </div>
            <Switch
              checked={weeklyDigest}
              onCheckedChange={setWeeklyDigest}
              disabled={!emailNotifications}
            />
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t('security.title')}
          </CardTitle>
          <CardDescription>{t('security.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">{t('security.currentPassword')}</Label>
              <Input
                id="currentPassword"
                type="password"
                placeholder={t('security.currentPasswordPlaceholder')}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">{t('security.newPassword')}</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder={t('security.newPasswordPlaceholder')}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t('security.confirmPassword')}</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder={t('security.confirmPasswordPlaceholder')}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>
          <Button
            onClick={handleChangePassword}
            disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
          >
            {changingPassword ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            {t('security.updatePassword')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
