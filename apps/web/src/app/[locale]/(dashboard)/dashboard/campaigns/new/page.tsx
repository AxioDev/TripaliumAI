'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { Confetti } from '@/components/ui/confetti';
import { AnimatedCheckmark } from '@/components/ui/animated-checkmark';
import { campaignApi, jobApi, CreateCampaignData, JobSource } from '@/lib/api-client';
import { useApi, useMutation } from '@/hooks/use-api';
import { ArrowLeft, Loader2, Plus, X, ChevronDown, ChevronUp, HelpCircle, AlertTriangle } from 'lucide-react';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export default function NewCampaignPage() {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations('campaigns.new');
  const tCommon = useTranslations('common');

  const { data: jobSources } = useApi(() => jobApi.listSources());

  const [formData, setFormData] = useState<CreateCampaignData>({
    name: '',
    targetRoles: [],
    targetLocations: [],
    contractTypes: [],
    salaryMin: undefined,
    salaryMax: undefined,
    salaryCurrency: 'EUR',
    remoteOk: true,
    matchThreshold: 60,
    testMode: true,
    autoApply: false,
    jobSourceIds: [],
    maxApplications: 50,
    anonymizeApplications: false,
  });

  const [roleInput, setRoleInput] = useState('');
  const [locationInput, setLocationInput] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showProductionConfirm, setShowProductionConfirm] = useState(false);

  const createMutation = useMutation(
    (data: CreateCampaignData) => campaignApi.create(data),
    {
      onSuccess: (campaign) => {
        setShowConfetti(true);
        toast({
          title: (
            <span className="flex items-center gap-2">
              <AnimatedCheckmark size={18} />
              {t('toast.created.title')}
            </span>
          ) as unknown as string,
          description: t('toast.created.description'),
          variant: 'success',
        });
        setTimeout(() => {
          router.push(`/dashboard/campaigns/${campaign.id}`);
        }, 800);
      },
      onError: () => {
        toast({
          title: t('toast.error.title'),
          description: t('toast.error.createFailed'),
          variant: 'destructive',
        });
      },
    }
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.targetRoles.length === 0) {
      toast({
        title: t('toast.error.title'),
        description: t('toast.error.rolesRequired'),
        variant: 'destructive',
      });
      return;
    }

    if (formData.targetLocations.length === 0) {
      toast({
        title: t('toast.error.title'),
        description: t('toast.error.locationsRequired'),
        variant: 'destructive',
      });
      return;
    }

    // If production mode (testMode=false), show confirmation dialog
    if (!formData.testMode) {
      setShowProductionConfirm(true);
      return;
    }

    await createMutation.mutate(formData);
  };

  const handleConfirmProduction = async () => {
    setShowProductionConfirm(false);
    await createMutation.mutate(formData);
  };

  const addRole = () => {
    const role = roleInput.trim();
    if (role && !formData.targetRoles.includes(role)) {
      setFormData({
        ...formData,
        targetRoles: [...formData.targetRoles, role],
      });
      setRoleInput('');
    }
  };

  const removeRole = (role: string) => {
    setFormData({
      ...formData,
      targetRoles: formData.targetRoles.filter((r) => r !== role),
    });
  };

  const addLocation = () => {
    const location = locationInput.trim();
    if (location && !formData.targetLocations.includes(location)) {
      setFormData({
        ...formData,
        targetLocations: [...formData.targetLocations, location],
      });
      setLocationInput('');
    }
  };

  const removeLocation = (location: string) => {
    setFormData({
      ...formData,
      targetLocations: formData.targetLocations.filter((l) => l !== location),
    });
  };

  const toggleJobSource = (sourceId: string) => {
    const current = formData.jobSourceIds || [];
    if (current.includes(sourceId)) {
      setFormData({
        ...formData,
        jobSourceIds: current.filter((id) => id !== sourceId),
      });
    } else {
      setFormData({
        ...formData,
        jobSourceIds: [...current, sourceId],
      });
    }
  };

  const contractTypeOptions = [
    { key: 'fullTime', value: 'Full-time' },
    { key: 'partTime', value: 'Part-time' },
    { key: 'contract', value: 'Contract' },
    { key: 'freelance', value: 'Freelance' },
    { key: 'internship', value: 'Internship' },
  ];

  // Map job source names to translation keys
  const getSourceDisplayName = (source: JobSource): string => {
    const nameKey = source.name?.toLowerCase().replace(/[^a-z]/g, '');
    const knownSources: Record<string, string> = {
      manual: 'manual',
      mock: 'mock',
      remoteok: 'remoteok',
      welcometothejungle: 'welcometothejungle',
    };
    const translationKey = nameKey ? knownSources[nameKey] : null;
    if (translationKey) {
      return t(`sources.names.${translationKey}`);
    }
    return source.displayName;
  };

  const toggleContractType = (type: string) => {
    const current = formData.contractTypes || [];
    if (current.includes(type)) {
      setFormData({
        ...formData,
        contractTypes: current.filter((t) => t !== type),
      });
    } else {
      setFormData({
        ...formData,
        contractTypes: [...current, type],
      });
    }
  };

  return (
    <div className="space-y-8">
      <Confetti active={showConfetti} />
      <div className="flex items-center gap-4">
        <Link href="/dashboard/campaigns">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">
            {t('subtitle')}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>{t('details.title')}</CardTitle>
            <CardDescription>
              {t('details.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('details.name')}</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder={t('details.namePlaceholder')}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>{t('details.targetRoles')}</Label>
              <div className="flex gap-2">
                <Input
                  value={roleInput}
                  onChange={(e) => setRoleInput(e.target.value)}
                  placeholder={t('details.targetRolesPlaceholder')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addRole();
                    }
                  }}
                />
                <Button type="button" onClick={addRole} variant="outline">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {formData.targetRoles.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.targetRoles.map((role) => (
                    <span
                      key={role}
                      className="inline-flex items-center gap-1 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm"
                    >
                      {role}
                      <button
                        type="button"
                        onClick={() => removeRole(role)}
                        className="hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>{t('details.targetLocations')}</Label>
              <div className="flex gap-2">
                <Input
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  placeholder={t('details.targetLocationsPlaceholder')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addLocation();
                    }
                  }}
                />
                <Button type="button" onClick={addLocation} variant="outline">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {formData.targetLocations.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.targetLocations.map((location) => (
                    <span
                      key={location}
                      className="inline-flex items-center gap-1 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm"
                    >
                      {location}
                      <button
                        type="button"
                        onClick={() => removeLocation(location)}
                        className="hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Advanced Options Toggle */}
        <Button
          type="button"
          variant="ghost"
          className="w-full justify-between"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          <span>{t('advanced.title')}</span>
          {showAdvanced ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>

        {/* Advanced Options Section */}
        {showAdvanced && (
          <>
            {/* Preferences */}
            <Card>
              <CardHeader>
                <CardTitle>{t('advanced.preferences.title')}</CardTitle>
            <CardDescription>
              {t('advanced.preferences.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t('advanced.contractTypes')}</Label>
              <div className="flex flex-wrap gap-2">
                {contractTypeOptions.map((type) => (
                  <button
                    key={type.key}
                    type="button"
                    onClick={() => toggleContractType(type.value)}
                    className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                      formData.contractTypes?.includes(type.value)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background hover:bg-muted border-input'
                    }`}
                  >
                    {t(`contractTypes.${type.key}`)}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {t('advanced.contractTypesHint')}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="salaryMin">{t('advanced.salaryMin')}</Label>
                <Input
                  id="salaryMin"
                  type="number"
                  value={formData.salaryMin || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      salaryMin: e.target.value ? parseInt(e.target.value) : undefined,
                    })
                  }
                  placeholder="40000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="salaryMax">{t('advanced.salaryMax')}</Label>
                <Input
                  id="salaryMax"
                  type="number"
                  value={formData.salaryMax || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      salaryMax: e.target.value ? parseInt(e.target.value) : undefined,
                    })
                  }
                  placeholder="80000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="salaryCurrency">{t('advanced.currency')}</Label>
                <Input
                  id="salaryCurrency"
                  value={formData.salaryCurrency}
                  onChange={(e) =>
                    setFormData({ ...formData, salaryCurrency: e.target.value })
                  }
                  placeholder="EUR"
                  maxLength={3}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t('advanced.remoteWork')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('advanced.remoteWorkHint')}
                </p>
              </div>
              <Switch
                checked={formData.remoteOk}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, remoteOk: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between border-t pt-4">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  {t('advanced.anonymize')}
                  <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-0.5 rounded">
                    {t('advanced.anonymizeRecommended')}
                  </span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>{t('advanced.anonymizeHint')}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t('advanced.anonymizeDescription')}
                </p>
              </div>
              <Switch
                checked={formData.anonymizeApplications}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, anonymizeApplications: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Matching Settings */}
        <Card>
          <CardHeader>
            <CardTitle>{t('matching.title')}</CardTitle>
            <CardDescription>
              {t('matching.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="matchThreshold" className="flex items-center gap-2">
                {t('matching.threshold')}: {formData.matchThreshold}%
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>{t('matching.thresholdHint')}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <input
                type="range"
                id="matchThreshold"
                min="0"
                max="100"
                value={formData.matchThreshold}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    matchThreshold: parseInt(e.target.value),
                  })
                }
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                {(formData.matchThreshold ?? 60) >= 80 && t('matching.thresholdStrict')}
                {(formData.matchThreshold ?? 60) >= 50 && (formData.matchThreshold ?? 60) < 80 && t('matching.thresholdBalanced')}
                {(formData.matchThreshold ?? 60) < 50 && t('matching.thresholdRelaxed')}
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  {t('automation.autoApply')}
                  <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-0.5 rounded">
                    {t('automation.autoApplyBeta')}
                  </span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>{t('automation.autoApplyHint')}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t('automation.autoApplyDescription')}
                </p>
                {!formData.testMode && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    {t('automation.autoApplyDisabledInProduction')}
                  </p>
                )}
              </div>
              <Switch
                checked={formData.autoApply}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, autoApply: checked })
                }
                disabled={!formData.testMode}
              />
            </div>

            <div className="flex items-center justify-between border-t pt-4">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  {t('automation.practiceMode')}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>{t('automation.practiceModeHint')}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t('automation.practiceModeDescription')}
                </p>
              </div>
              <Switch
                checked={formData.testMode}
                onCheckedChange={(checked) => {
                  // If turning off practice mode, also disable autoApply
                  if (!checked) {
                    setFormData({ ...formData, testMode: checked, autoApply: false });
                  } else {
                    setFormData({ ...formData, testMode: checked });
                  }
                }}
              />
            </div>

            {/* Production mode warning */}
            {!formData.testMode && (
              <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    {t('automation.productionWarning')}
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    {t('automation.productionWarningDescription')}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Job Sources */}
        {jobSources && jobSources.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t('sources.title')}</CardTitle>
              <CardDescription>
                {t('sources.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {jobSources.map((source: JobSource) => (
                  <button
                    key={source.id}
                    type="button"
                    onClick={() => toggleJobSource(source.id)}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                      formData.jobSourceIds?.includes(source.id)
                        ? 'border-primary bg-primary/5'
                        : 'border-input hover:bg-muted'
                    }`}
                  >
                    <div className="text-left">
                      <p className="font-medium text-sm">{getSourceDisplayName(source)}</p>
                      {source.supportsAutoApply && (
                        <p className="text-xs text-muted-foreground">
                          {t('sources.supportsAutoApply')}
                        </p>
                      )}
                    </div>
                    <div
                      className={`w-4 h-4 rounded-full border-2 ${
                        formData.jobSourceIds?.includes(source.id)
                          ? 'bg-primary border-primary'
                          : 'border-muted-foreground'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
          </>
        )}

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Link href="/dashboard/campaigns">
            <Button type="button" variant="outline">
              {tCommon('actions.cancel')}
            </Button>
          </Link>
          <Button type="submit" disabled={createMutation.isLoading}>
            {createMutation.isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('actions.creating')}
              </>
            ) : (
              t('actions.create')
            )}
          </Button>
        </div>
      </form>

      {/* Production Mode Confirmation Dialog */}
      <AlertDialog open={showProductionConfirm} onOpenChange={setShowProductionConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {t('productionConfirm.title')}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>{t('productionConfirm.description')}</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>{t('productionConfirm.consequences.realApplications')}</li>
                  <li>{t('productionConfirm.consequences.visibleToEmployers')}</li>
                  <li>{t('productionConfirm.consequences.cannotUndo')}</li>
                </ul>
                <p className="font-medium">{t('productionConfirm.confirmQuestion')}</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon('actions.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmProduction}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {t('productionConfirm.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
