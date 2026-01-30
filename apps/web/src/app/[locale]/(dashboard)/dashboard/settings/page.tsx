'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
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
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { authApi, billingApi } from '@/lib/api-client';
import { useSubscription } from '@/contexts/subscription-context';
import {
  User,
  Target,
  Bell,
  Shield,
  Loader2,
  Save,
  Globe,
  AlertTriangle,
  Download,
  Trash2,
  CreditCard,
  Sparkles,
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

  // Danger zone
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [exportingData, setExportingData] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);
  const { plan, isPaid, usage, refresh: refreshSubscription } = useSubscription();

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

  const handleExportData = async () => {
    setExportingData(true);
    try {
      const data = await authApi.exportData();
      // Download as JSON file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tripalium-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({
        title: t('toast.dataExported.title'),
        description: t('toast.dataExported.description'),
      });
    } catch {
      toast({
        title: t('toast.error.title'),
        description: t('toast.error.exportFailed'),
        variant: 'destructive',
      });
    } finally {
      setExportingData(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      await authApi.deleteAccount();
      toast({
        title: t('toast.accountDeleted.title'),
        description: t('toast.accountDeleted.description'),
      });
      // Sign out and redirect
      await signOut({ callbackUrl: '/' });
    } catch {
      toast({
        title: t('toast.error.title'),
        description: t('toast.error.deleteFailed'),
        variant: 'destructive',
      });
      setDeletingAccount(false);
    }
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

      {/* Subscription */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            {t('subscription.title')}
          </CardTitle>
          <CardDescription>{t('subscription.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${
              plan === 'PRO'
                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                : plan === 'STARTER'
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
            }`}>
              <Sparkles className="h-3.5 w-3.5" />
              {t(`subscription.plans.${plan.toLowerCase()}`)}
            </span>
          </div>

          {usage && (
            <div className="space-y-3">
              {[
                { label: t('subscription.usage.cvUploads'), ...usage.cvUploads },
                { label: t('subscription.usage.campaigns'), ...usage.campaigns },
                { label: t('subscription.usage.activeCampaigns'), ...usage.activeCampaigns },
                { label: t('subscription.usage.docGenerations'), ...usage.documentGenerations },
                { label: t('subscription.usage.submissions'), ...usage.applicationSubmissions },
              ].map((item) => (
                <div key={item.label} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-medium">{item.current} / {item.limit}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all ${
                        item.limit > 0 && item.current >= item.limit
                          ? 'bg-red-500'
                          : item.limit > 0 && item.current / item.limit > 0.8
                          ? 'bg-amber-500'
                          : 'bg-primary'
                      }`}
                      style={{ width: `${item.limit > 0 ? Math.min(100, (item.current / item.limit) * 100) : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div>
            {isPaid ? (
              <Button
                variant="outline"
                disabled={billingLoading}
                onClick={async () => {
                  setBillingLoading(true);
                  try {
                    const { url } = await billingApi.getPortalUrl();
                    window.location.href = url;
                  } catch {
                    // ignore
                  } finally {
                    setBillingLoading(false);
                  }
                }}
              >
                {billingLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('subscription.manageBilling')}
              </Button>
            ) : (
              <Button
                className="bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600"
                disabled={billingLoading}
                onClick={async () => {
                  setBillingLoading(true);
                  try {
                    const { url } = await billingApi.createCheckout('STARTER');
                    window.location.href = url;
                  } catch {
                    window.location.href = '/pricing';
                  } finally {
                    setBillingLoading(false);
                  }
                }}
              >
                {billingLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Sparkles className="mr-2 h-4 w-4" />
                {t('subscription.upgrade')}
              </Button>
            )}
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

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            {t('dangerZone.title')}
          </CardTitle>
          <CardDescription>{t('dangerZone.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Export Data */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="font-medium">{t('dangerZone.exportData')}</div>
              <p className="text-sm text-muted-foreground">
                {t('dangerZone.exportDataDescription')}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('dangerZone.exportDataHint')}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleExportData}
              disabled={exportingData}
            >
              {exportingData ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              {t('dangerZone.exportData')}
            </Button>
          </div>

          <Separator />

          {/* Delete Account */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="font-medium text-destructive">{t('dangerZone.deleteAccount')}</div>
              <p className="text-sm text-muted-foreground">
                {t('dangerZone.deleteAccountDescription')}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('dangerZone.deleteAccountHint')}
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t('dangerZone.deleteAccount')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete Account Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              {t('deleteDialog.title')}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>{t('deleteDialog.description')}</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>{t('deleteDialog.consequences.profile')}</li>
                  <li>{t('deleteDialog.consequences.cvs')}</li>
                  <li>{t('deleteDialog.consequences.campaigns')}</li>
                  <li>{t('deleteDialog.consequences.applications')}</li>
                  <li>{t('deleteDialog.consequences.logs')}</li>
                </ul>
                <p className="font-semibold text-destructive">{t('deleteDialog.warning')}</p>
                <div className="space-y-2">
                  <Label htmlFor="deleteConfirm">{t('deleteDialog.confirmLabel')}</Label>
                  <Input
                    id="deleteConfirm"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder={t('deleteDialog.confirmPlaceholder')}
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmText('')}>
              {t('deleteDialog.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={deleteConfirmText !== 'DELETE' && deleteConfirmText !== 'SUPPRIMER'}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingAccount ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              {t('deleteDialog.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
