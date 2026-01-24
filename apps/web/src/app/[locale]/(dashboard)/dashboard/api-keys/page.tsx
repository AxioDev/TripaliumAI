'use client';

import { useState } from 'react';
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
import { useToast } from '@/components/ui/use-toast';
import { apiKeysApi, ApiKeyInfo } from '@/lib/api-client';
import { useApi, useMutation } from '@/hooks/use-api';
import {
  Key,
  Plus,
  Trash2,
  Copy,
  Check,
  Loader2,
  AlertTriangle,
  Clock,
  Shield,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const scopeColors: Record<string, string> = {
  READ: 'bg-blue-100 text-blue-800',
  WRITE: 'bg-green-100 text-green-800',
  ADMIN: 'bg-purple-100 text-purple-800',
  TEST: 'bg-orange-100 text-orange-800',
};

const scopeKeyMap: Record<string, string> = {
  READ: 'read',
  WRITE: 'write',
  ADMIN: 'admin',
  TEST: 'test',
};

export default function ApiKeysPage() {
  const { toast } = useToast();
  const t = useTranslations('apiKeys');
  const tCommon = useTranslations('common');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showKeyDialog, setShowKeyDialog] = useState(false);
  const [newKeyValue, setNewKeyValue] = useState('');
  const [copied, setCopied] = useState(false);
  const [deleteKeyId, setDeleteKeyId] = useState<string | null>(null);

  // Form state
  const [keyName, setKeyName] = useState('');
  const [keyScope, setKeyScope] = useState<'READ' | 'WRITE' | 'ADMIN' | 'TEST'>('READ');
  const [expiresInDays, setExpiresInDays] = useState<string>('');

  // Fetch API keys
  const {
    data: apiKeys,
    isLoading,
    refetch,
  } = useApi(() => apiKeysApi.list(), {
    onError: () => {
      toast({
        title: t('toast.error.title'),
        description: t('toast.error.loadFailed'),
        variant: 'destructive',
      });
    },
  });

  // Create key mutation
  const createMutation = useMutation(
    () => apiKeysApi.create(keyName, keyScope, expiresInDays ? parseInt(expiresInDays) : undefined),
    {
      onSuccess: (data) => {
        setNewKeyValue(data.key);
        setShowCreateDialog(false);
        setShowKeyDialog(true);
        setKeyName('');
        setKeyScope('READ');
        setExpiresInDays('');
        refetch();
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

  // Revoke key mutation
  const revokeMutation = useMutation(
    (id: string) => apiKeysApi.revoke(id),
    {
      onSuccess: () => {
        refetch();
        setDeleteKeyId(null);
        toast({
          title: t('toast.revoked.title'),
          description: t('toast.revoked.description'),
        });
      },
      onError: () => {
        toast({
          title: t('toast.error.title'),
          description: t('toast.error.revokeFailed'),
          variant: 'destructive',
        });
      },
    }
  );

  const copyToClipboard = () => {
    navigator.clipboard.writeText(newKeyValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateKey = () => {
    if (!keyName.trim()) {
      toast({
        title: t('toast.error.title'),
        description: t('toast.error.nameRequired'),
        variant: 'destructive',
      });
      return;
    }
    createMutation.mutate();
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">{t('title')}</h1>
          <p className="text-sm text-muted-foreground md:text-base">
            {t('subtitle')}
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="self-start sm:self-auto">
          <Plus className="mr-2 h-4 w-4" />
          {t('createKey')}
        </Button>
      </div>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900">{t('info.title')}</p>
              <p className="text-sm text-blue-800">
                {t('info.description')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Keys List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            {t('list.title')}
          </CardTitle>
          <CardDescription>
            {t('list.count', { count: apiKeys?.length || 0 })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !apiKeys || apiKeys.length === 0 ? (
            <div className="text-center py-8">
              <Key className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">{t('empty.title')}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t('empty.description')}
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                {t('empty.action')}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {apiKeys.map((key: ApiKeyInfo) => {
                const scopeKey = scopeKeyMap[key.scope] || 'read';
                const scopeColor = scopeColors[key.scope] || scopeColors.READ;

                return (
                  <div
                    key={key.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium truncate">{key.name}</h4>
                        <span className={`text-xs px-2 py-0.5 rounded ${scopeColor}`}>
                          {t(`scope.${scopeKey}.label`)}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                        <span className="font-mono">{key.keyPrefix}...</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {t('created')} {formatDistanceToNow(new Date(key.createdAt), { addSuffix: true })}
                        </span>
                        {key.lastUsedAt && (
                          <span>
                            {t('lastUsed')} {formatDistanceToNow(new Date(key.lastUsedAt), { addSuffix: true })}
                          </span>
                        )}
                        {key.expiresAt && (
                          <span className="text-yellow-600">
                            {t('expires')} {formatDistanceToNow(new Date(key.expiresAt), { addSuffix: true })}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setDeleteKeyId(key.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Key Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('createDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('createDialog.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="keyName">{t('createDialog.name')}</Label>
              <Input
                id="keyName"
                placeholder={t('createDialog.namePlaceholder')}
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {t('createDialog.nameHint')}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="keyScope">{t('createDialog.scope')}</Label>
              <Select value={keyScope} onValueChange={(v) => setKeyScope(v as typeof keyScope)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('createDialog.scopePlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {(['READ', 'WRITE', 'ADMIN', 'TEST'] as const).map((value) => (
                    <SelectItem key={value} value={value}>
                      <div className="flex flex-col">
                        <span>{t(`scope.${scopeKeyMap[value]}.label`)}</span>
                        <span className="text-xs text-muted-foreground">{t(`scope.${scopeKeyMap[value]}.description`)}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiresInDays">{t('createDialog.expiration')}</Label>
              <Select value={expiresInDays} onValueChange={setExpiresInDays}>
                <SelectTrigger>
                  <SelectValue placeholder={t('createDialog.expirationNever')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t('createDialog.expirationNever')}</SelectItem>
                  <SelectItem value="7">{t('createDialog.expiration7Days')}</SelectItem>
                  <SelectItem value="30">{t('createDialog.expiration30Days')}</SelectItem>
                  <SelectItem value="90">{t('createDialog.expiration90Days')}</SelectItem>
                  <SelectItem value="365">{t('createDialog.expiration1Year')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              {tCommon('actions.cancel')}
            </Button>
            <Button onClick={handleCreateKey} disabled={createMutation.isLoading}>
              {createMutation.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('createKey')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Show Key Dialog */}
      <Dialog open={showKeyDialog} onOpenChange={setShowKeyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('keyCreated.title')}</DialogTitle>
            <DialogDescription>
              {t('keyCreated.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center gap-2">
              <Input
                value={newKeyValue}
                readOnly
                className="font-mono text-sm"
              />
              <Button variant="outline" size="icon" onClick={copyToClipboard}>
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                <p className="text-sm text-yellow-800">
                  {t('keyCreated.warning')}
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowKeyDialog(false)}>
              {tCommon('actions.done')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteKeyId} onOpenChange={() => setDeleteKeyId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('revokeDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('revokeDialog.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon('actions.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteKeyId && revokeMutation.mutate(deleteKeyId)}
            >
              {revokeMutation.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('revokeDialog.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
