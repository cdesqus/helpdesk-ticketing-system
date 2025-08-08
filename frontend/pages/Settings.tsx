import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useBackend } from "../hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import SystemLogo from "../components/SystemLogo";
import { Save, Mail, Settings as SettingsIcon, Palette, Upload } from "lucide-react";

export default function Settings() {
  const { toast } = useToast();
  const backend = useBackend();
  const queryClient = useQueryClient();

  const [smtpConfig, setSMTPConfig] = useState({
    provider: "",
    host: "",
    port: 587,
    username: "",
    password: "",
    fromEmail: "helpdesk@idesolusi.co.id",
  });

  const [systemConfig, setSystemConfig] = useState({
    systemName: "",
    logoUrl: "",
    faviconUrl: "",
    primaryColor: "#3b82f6",
    secondaryColor: "#1e40af",
  });

  const { data: currentSMTPConfig, isLoading: smtpLoading } = useQuery({
    queryKey: ["smtp-config"],
    queryFn: () => backend.ticket.getSMTPConfig(),
  });

  const { data: currentSystemConfig, isLoading: systemLoading } = useQuery({
    queryKey: ["system-config"],
    queryFn: () => backend.ticket.getSystemConfig(),
  });

  const configureSMTPMutation = useMutation({
    mutationFn: (data: any) => backend.ticket.configureSMTP(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["smtp-config"] });
      toast({
        title: "SMTP configured",
        description: "Email settings have been saved successfully.",
      });
    },
    onError: (error: any) => {
      console.error("Failed to configure SMTP:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save email settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateSystemConfigMutation = useMutation({
    mutationFn: (data: any) => backend.ticket.updateSystemConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-config"] });
      toast({
        title: "System configuration updated",
        description: "System settings have been saved successfully.",
      });
    },
    onError: (error: any) => {
      console.error("Failed to update system config:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save system settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  React.useEffect(() => {
    if (currentSMTPConfig?.config) {
      setSMTPConfig({
        provider: currentSMTPConfig.config.provider,
        host: currentSMTPConfig.config.host,
        port: currentSMTPConfig.config.port,
        username: currentSMTPConfig.config.username,
        password: currentSMTPConfig.config.password,
        fromEmail: currentSMTPConfig.config.fromEmail,
      });
    }
  }, [currentSMTPConfig]);

  React.useEffect(() => {
    if (currentSystemConfig?.config) {
      setSystemConfig({
        systemName: currentSystemConfig.config.systemName,
        logoUrl: currentSystemConfig.config.logoUrl || "",
        faviconUrl: currentSystemConfig.config.faviconUrl || "",
        primaryColor: currentSystemConfig.config.primaryColor,
        secondaryColor: currentSystemConfig.config.secondaryColor,
      });
    }
  }, [currentSystemConfig]);

  const handleProviderChange = (provider: string) => {
    setSMTPConfig(prev => ({ ...prev, provider }));
    
    // Set default configurations for common providers
    switch (provider) {
      case "gmail":
        setSMTPConfig(prev => ({
          ...prev,
          host: "smtp.gmail.com",
          port: 587,
        }));
        break;
      case "office365":
        setSMTPConfig(prev => ({
          ...prev,
          host: "smtp.office365.com",
          port: 587,
        }));
        break;
      case "custom":
        setSMTPConfig(prev => ({
          ...prev,
          host: "",
          port: 587,
        }));
        break;
    }
  };

  const handleSMTPSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!smtpConfig.provider || !smtpConfig.host || !smtpConfig.username || !smtpConfig.password) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    configureSMTPMutation.mutate(smtpConfig);
  };

  const handleSystemConfigSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!systemConfig.systemName.trim()) {
      toast({
        title: "Validation Error",
        description: "System name is required.",
        variant: "destructive",
      });
      return;
    }

    const updateData = {
      ...systemConfig,
      logoUrl: systemConfig.logoUrl || undefined,
      faviconUrl: systemConfig.faviconUrl || undefined,
    };

    updateSystemConfigMutation.mutate(updateData);
  };

  if (smtpLoading || systemLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded animate-pulse"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <SettingsIcon className="w-8 h-8 text-gray-600" />
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
      </div>

      <Tabs defaultValue="system" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="system" className="flex items-center">
            <Palette className="w-4 h-4 mr-2" />
            System Configuration
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center">
            <Mail className="w-4 h-4 mr-2" />
            Email Configuration
          </TabsTrigger>
        </TabsList>

        <TabsContent value="system">
          <form onSubmit={handleSystemConfigSubmit}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Palette className="w-5 h-5 mr-2" />
                  System Branding & Appearance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Preview Section */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                  <h4 className="font-medium text-gray-900 mb-4">Preview</h4>
                  <div className="flex items-center justify-center p-8 bg-white rounded-lg border">
                    <SystemLogo size="lg" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="systemName">System Name *</Label>
                    <Input
                      id="systemName"
                      value={systemConfig.systemName}
                      onChange={(e) => setSystemConfig({ ...systemConfig, systemName: e.target.value })}
                      placeholder="IDESOLUSI Helpdesk"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="logoUrl">Logo URL</Label>
                    <Input
                      id="logoUrl"
                      type="url"
                      value={systemConfig.logoUrl}
                      onChange={(e) => setSystemConfig({ ...systemConfig, logoUrl: e.target.value })}
                      placeholder="https://example.com/logo.png"
                    />
                    <p className="text-xs text-gray-500">
                      Recommended size: 200x200px or smaller. Supports PNG, JPG, SVG formats.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="faviconUrl">Favicon URL</Label>
                    <Input
                      id="faviconUrl"
                      type="url"
                      value={systemConfig.faviconUrl}
                      onChange={(e) => setSystemConfig({ ...systemConfig, faviconUrl: e.target.value })}
                      placeholder="https://example.com/favicon.ico"
                    />
                    <p className="text-xs text-gray-500">
                      Recommended size: 32x32px. Supports ICO, PNG formats.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="primaryColor">Primary Color</Label>
                    <div className="flex space-x-2">
                      <Input
                        id="primaryColor"
                        type="color"
                        value={systemConfig.primaryColor}
                        onChange={(e) => setSystemConfig({ ...systemConfig, primaryColor: e.target.value })}
                        className="w-16 h-10 p-1 border rounded"
                      />
                      <Input
                        value={systemConfig.primaryColor}
                        onChange={(e) => setSystemConfig({ ...systemConfig, primaryColor: e.target.value })}
                        placeholder="#3b82f6"
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="secondaryColor">Secondary Color</Label>
                    <div className="flex space-x-2">
                      <Input
                        id="secondaryColor"
                        type="color"
                        value={systemConfig.secondaryColor}
                        onChange={(e) => setSystemConfig({ ...systemConfig, secondaryColor: e.target.value })}
                        className="w-16 h-10 p-1 border rounded"
                      />
                      <Input
                        value={systemConfig.secondaryColor}
                        onChange={(e) => setSystemConfig({ ...systemConfig, secondaryColor: e.target.value })}
                        placeholder="#1e40af"
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <h4 className="font-medium text-blue-900 mb-2">Branding Guidelines:</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Logo should be in PNG, JPG, or SVG format for best quality</li>
                    <li>• Favicon should be 32x32px for optimal display across browsers</li>
                    <li>• Colors should provide good contrast for accessibility</li>
                    <li>• Changes will be reflected immediately across the system</li>
                  </ul>
                </div>

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={updateSystemConfigMutation.isPending}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {updateSystemConfigMutation.isPending ? "Saving..." : "Save Configuration"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </TabsContent>

        <TabsContent value="email">
          <form onSubmit={handleSMTPSubmit}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Mail className="w-5 h-5 mr-2" />
                  SMTP Email Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="provider">Email Provider *</Label>
                    <Select
                      value={smtpConfig.provider}
                      onValueChange={handleProviderChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select email provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gmail">Gmail</SelectItem>
                        <SelectItem value="office365">Office 365</SelectItem>
                        <SelectItem value="custom">Custom SMTP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fromEmail">From Email *</Label>
                    <Input
                      id="fromEmail"
                      type="email"
                      value={smtpConfig.fromEmail}
                      onChange={(e) => setSMTPConfig({ ...smtpConfig, fromEmail: e.target.value })}
                      placeholder="helpdesk@idesolusi.co.id"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="host">SMTP Host *</Label>
                    <Input
                      id="host"
                      value={smtpConfig.host}
                      onChange={(e) => setSMTPConfig({ ...smtpConfig, host: e.target.value })}
                      placeholder="smtp.gmail.com"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="port">SMTP Port *</Label>
                    <Input
                      id="port"
                      type="number"
                      value={smtpConfig.port}
                      onChange={(e) => setSMTPConfig({ ...smtpConfig, port: parseInt(e.target.value) })}
                      placeholder="587"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="username">Username *</Label>
                    <Input
                      id="username"
                      value={smtpConfig.username}
                      onChange={(e) => setSMTPConfig({ ...smtpConfig, username: e.target.value })}
                      placeholder="your-email@gmail.com"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={smtpConfig.password}
                      onChange={(e) => setSMTPConfig({ ...smtpConfig, password: e.target.value })}
                      placeholder="Your email password or app password"
                      required
                    />
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <h4 className="font-medium text-blue-900 mb-2">Configuration Notes:</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• For Gmail: Use an App Password instead of your regular password</li>
                    <li>• For Office 365: Use your full email address as username</li>
                    <li>• Emails will be sent from: {smtpConfig.fromEmail}</li>
                    <li>• Email notifications are sent when tickets are created or updated</li>
                  </ul>
                </div>

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={configureSMTPMutation.isPending}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {configureSMTPMutation.isPending ? "Saving..." : "Save Configuration"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>

          <Card>
            <CardHeader>
              <CardTitle>Email-to-Ticket Integration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                <h4 className="font-medium text-gray-900 mb-2">Email Integration Setup:</h4>
                <div className="text-sm text-gray-700 space-y-2">
                  <p>To enable email-to-ticket automation for <strong>helpdesk@idesolusi.co.id</strong>:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-4">
                    <li>Configure your email server to forward incoming emails to this system</li>
                    <li>Set up email parsing rules to extract ticket information</li>
                    <li>Ensure the SMTP configuration above is properly set</li>
                    <li>Test the integration by sending an email to helpdesk@idesolusi.co.id</li>
                  </ol>
                  <p className="mt-3 text-xs text-gray-600">
                    Note: Email-to-ticket functionality requires additional server-side configuration 
                    and email parsing implementation.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
