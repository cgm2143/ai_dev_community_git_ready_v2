'use client';

import * as React from 'react';
import { useSiteSettings, useUpdateSiteSetting } from '@/features/admin/hooks/useAdmin';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function SettingRow({ settingKey, value }: { settingKey: string; value: unknown }) {
  const [text, setText] = React.useState(JSON.stringify(value));
  const updateMutation = useUpdateSiteSetting();

  const handleSave = () => {
    try {
      const parsed = JSON.parse(text);
      updateMutation.mutate({ key: settingKey, value: parsed });
    } catch {
      updateMutation.mutate({ key: settingKey, value: text });
    }
  };

  return (
    <div className="flex items-end gap-2">
      <div className="flex flex-1 flex-col gap-1.5">
        <Label>{settingKey}</Label>
        <Input value={text} onChange={(e) => setText(e.target.value)} className="font-mono" />
      </div>
      <Button variant="outline" size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
        저장
      </Button>
    </div>
  );
}

export default function AdminSettingsPage() {
  const { data: settings, isLoading } = useSiteSettings();
  const [newKey, setNewKey] = React.useState('');
  const [newValue, setNewValue] = React.useState('');
  const updateMutation = useUpdateSiteSetting();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-xl font-semibold text-text-primary">사이트 설정</h1>

      <Card>
        <CardContent className="flex flex-col gap-3 pt-5">
          {isLoading && <p className="text-sm text-text-muted">불러오는 중...</p>}
          {settings?.map((setting) => (
            <SettingRow key={setting.key} settingKey={setting.key} value={setting.value} />
          ))}
          {settings?.length === 0 && <p className="text-sm text-text-muted">등록된 설정이 없습니다.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>새 설정 추가</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="newKey">키</Label>
              <Input
                id="newKey"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="site.title"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="newValue">값 (JSON)</Label>
              <Input
                id="newValue"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder='"코비온" 또는 123'
                className="font-mono"
              />
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                if (!newKey) return;
                try {
                  updateMutation.mutate({ key: newKey, value: JSON.parse(newValue) });
                } catch {
                  updateMutation.mutate({ key: newKey, value: newValue });
                }
                setNewKey('');
                setNewValue('');
              }}
            >
              추가
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
