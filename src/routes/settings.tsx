import { useState, useEffect } from "react";
import { getSetting, setSetting } from "@/lib/settings";
import { resetS3Client } from "@/lib/s3";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default function SettingsPage() {
  const [accessKeyId, setAccessKeyId] = useState("");
  const [secretAccessKey, setSecretAccessKey] = useState("");
  const [region, setRegion] = useState("");
  const [bucketName, setBucketName] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        const [ak, sk, rg, bn] = await Promise.all([
          getSetting("aws_access_key_id"),
          getSetting("aws_secret_access_key"),
          getSetting("aws_region"),
          getSetting("aws_s3_bucket_name"),
        ]);
        setAccessKeyId(ak ?? "");
        setSecretAccessKey(sk ?? "");
        setRegion(rg ?? "");
        setBucketName(bn ?? "");
      } catch {
        setMessage({ type: "error", text: "설정을 불러오는데 실패했습니다." });
      }
    }
    loadSettings();
  }, []);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      await Promise.all([
        setSetting("aws_access_key_id", accessKeyId),
        setSetting("aws_secret_access_key", secretAccessKey),
        setSetting("aws_region", region),
        setSetting("aws_s3_bucket_name", bucketName),
      ]);
      resetS3Client();
      setMessage({ type: "success", text: "설정이 저장되었습니다." });
    } catch {
      setMessage({ type: "error", text: "설정 저장에 실패했습니다." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <h1 className="text-2xl font-bold tracking-tight">설정</h1>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>AWS S3 설정</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="aws-access-key-id">AWS Access Key ID</Label>
            <Input
              id="aws-access-key-id"
              type="text"
              value={accessKeyId}
              onChange={(e) => setAccessKeyId(e.target.value)}
              placeholder="AKIAIOSFODNN7EXAMPLE"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="aws-secret-access-key">AWS Secret Access Key</Label>
            <Input
              id="aws-secret-access-key"
              type="password"
              value={secretAccessKey}
              onChange={(e) => setSecretAccessKey(e.target.value)}
              placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="aws-region">AWS Region</Label>
            <Input
              id="aws-region"
              type="text"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="ap-southeast-1"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="aws-bucket-name">S3 Bucket Name</Label>
            <Input
              id="aws-bucket-name"
              type="text"
              value={bucketName}
              onChange={(e) => setBucketName(e.target.value)}
              placeholder="my-app-images"
            />
          </div>

          {message && (
            <p
              className={
                message.type === "success"
                  ? "text-sm text-green-600 dark:text-green-400"
                  : "text-sm text-red-600 dark:text-red-400"
              }
            >
              {message.text}
            </p>
          )}

          <Button onClick={handleSave} disabled={saving}>
            {saving ? "저장 중..." : "저장"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
