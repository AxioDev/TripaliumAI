'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
import { campaignApi, jobApi, CreateCampaignData, JobSource } from '@/lib/api-client';
import { useApi, useMutation } from '@/hooks/use-api';
import { ArrowLeft, Loader2, Plus, X, ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export default function NewCampaignPage() {
  const router = useRouter();
  const { toast } = useToast();

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
  });

  const [roleInput, setRoleInput] = useState('');
  const [locationInput, setLocationInput] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const createMutation = useMutation(
    (data: CreateCampaignData) => campaignApi.create(data),
    {
      onSuccess: (campaign) => {
        toast({
          title: 'Campaign created!',
          description: 'Click "Start" to begin finding jobs.',
        });
        router.push(`/dashboard/campaigns/${campaign.id}`);
      },
      onError: () => {
        toast({
          title: 'Error',
          description: 'Failed to create campaign',
          variant: 'destructive',
        });
      },
    }
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.targetRoles.length === 0) {
      toast({
        title: 'Validation error',
        description: 'Please add at least one target role',
        variant: 'destructive',
      });
      return;
    }

    if (formData.targetLocations.length === 0) {
      toast({
        title: 'Validation error',
        description: 'Please add at least one target location',
        variant: 'destructive',
      });
      return;
    }

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
    'Full-time',
    'Part-time',
    'Contract',
    'Freelance',
    'Internship',
  ];

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
      <div className="flex items-center gap-4">
        <Link href="/dashboard/campaigns">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">New Campaign</h1>
          <p className="text-muted-foreground">
            Define your job search criteria
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Campaign Details</CardTitle>
            <CardDescription>
              Give your campaign a name and define the target roles
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Campaign Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., Senior Frontend Engineer - Paris"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Target Roles</Label>
              <div className="flex gap-2">
                <Input
                  value={roleInput}
                  onChange={(e) => setRoleInput(e.target.value)}
                  placeholder="e.g., Frontend Developer"
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
              <Label>Target Locations</Label>
              <div className="flex gap-2">
                <Input
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  placeholder="e.g., Paris, France"
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
          <span>Advanced options</span>
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
                <CardTitle>Preferences</CardTitle>
            <CardDescription>
              Set your contract and salary preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Contract Types</Label>
              <div className="flex flex-wrap gap-2">
                {contractTypeOptions.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleContractType(type)}
                    className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                      formData.contractTypes?.includes(type)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background hover:bg-muted border-input'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Leave empty to include all contract types
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="salaryMin">Minimum Salary</Label>
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
                <Label htmlFor="salaryMax">Maximum Salary</Label>
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
                <Label htmlFor="salaryCurrency">Currency</Label>
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
                <Label>Remote Work</Label>
                <p className="text-sm text-muted-foreground">
                  Include remote positions in search
                </p>
              </div>
              <Switch
                checked={formData.remoteOk}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, remoteOk: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Matching Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Matching Settings</CardTitle>
            <CardDescription>
              Configure how jobs are matched and processed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="matchThreshold" className="flex items-center gap-2">
                Match Threshold: {formData.matchThreshold}%
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Higher threshold = fewer but more relevant jobs. Lower threshold = more jobs but less relevant. Start with 60% and adjust based on results.</p>
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
                Jobs scoring below {formData.matchThreshold ?? 60}% won't appear.
                {(formData.matchThreshold ?? 60) >= 80 && " Strict - fewer but highly relevant matches."}
                {(formData.matchThreshold ?? 60) >= 50 && (formData.matchThreshold ?? 60) < 80 && " Balanced - recommended for most users."}
                {(formData.matchThreshold ?? 60) < 50 && " Relaxed - more jobs, but less relevant."}
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  Auto-Apply
                  <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-0.5 rounded">
                    Beta
                  </span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>When enabled, we'll automatically generate application documents for matching jobs. You'll still need to review and approve before anything is sent.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <p className="text-sm text-muted-foreground">
                  Automatically apply to jobs above threshold (requires review)
                </p>
              </div>
              <Switch
                checked={formData.autoApply}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, autoApply: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between border-t pt-4">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  Practice Mode
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>Perfect for testing! Documents are created but never actually sent to employers. Turn this off when you're ready to apply for real.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <p className="text-sm text-muted-foreground">
                  Practice mode: documents are generated but never sent to employers
                </p>
              </div>
              <Switch
                checked={formData.testMode}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, testMode: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Job Sources */}
        {jobSources && jobSources.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Job Sources</CardTitle>
              <CardDescription>
                Select which job boards to search (leave empty for all)
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
                      <p className="font-medium text-sm">{source.displayName}</p>
                      {source.supportsAutoApply && (
                        <p className="text-xs text-muted-foreground">
                          Supports auto-apply
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
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={createMutation.isLoading}>
            {createMutation.isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Campaign'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
