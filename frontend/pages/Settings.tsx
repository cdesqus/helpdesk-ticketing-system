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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import SystemLogo from "../components/SystemLogo";
import { 
  Save, 
  Mail, 
  Settings as SettingsIcon, 
  Palette, 
  Send, 
  CheckCircle, 
  AlertCircle,
  Activity,
  Trash2,
  RefreshCw,
  Eye,
  EyeOff
} from "lucide-react";

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

  const [testEmail, setTestEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const { data: currentSMTPConfig, isLoading: smtpLoading } = useQuery({
    queryKey: ["smtp-config"],
    queryFn: () => backend.ticket.getSMTPConfig(),
  });

  const { data: currentSystemConfig, isLoading: systemLoading } = useQuery({
    queryKey: ["system-config"],
    queryFn: () => backend.ticket.getSystemConfig(),
  });

  const { data: emailStats, isLoading: emailStatsLoading } = useQuery({
    queryKey: ["email-stats"],
    queryFn: () => backend.ticket.getEmailStats(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: emailLogs, isLoading: emailLogsLoading } = useQuery({
    queryKey: ["email-logs"],
    queryFn: () => backend.ticket.listEmailLogs({ limit: 20 }),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const configureSMTPMutation = useMutation({
    mutationFn: (data: any) => backend.ticket.configureSMTP(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["smtp-config"] });
      toast({
        title: "SMTP configuration saved",
        description: "Your email settings have been saved. You can now send a test email.",
      });
    },
    onError: (error: any) => {
      console.error("Failed to save SMTP configuration:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save email settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const testSMTPMutation = useMutation({
    mutationFn: (data: { testEmail: string }) => backend.ticket.testSMTP(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["email-stats"] });
      queryClient.invalidateQueries({ queryKey: ["email-logs"] });
      if (result.success) {
        toast({
          title: "Test email sent",
          description: result.message,
        });
      } else {
        toast({
          title: "Test failed",
          description: result.message,
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      console.error("Failed to test SMTP:", error);
      toast({
        title: "Test failed",
        description: error.message || "Failed to send test email.",
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

  const clearLogsMutation = useMutation({
    mutationFn: (daysOld: number) => backend.ticket.clearOldEmailLogs({ daysOld }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["email-logs"] });
      queryClient.invalidateQueries({ queryKey: ["email-stats"] });
      toast({
        title: "Logs cleared",
        description: `${result.deletedCount} old email logs have been deleted.`,
      });
    },
    onError: (error: any) => {
      console.error("Failed to clear logs:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to clear email logs.",
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

  const handleTestSMTP = () => {
    if (!testEmail.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a test email address.",
        variant: "destructive",
      });
      return;
    }

    if (!currentSMTPConfig?.config) {
      toast({
        title: "Configuration Required",
        description: "Please save SMTP configuration first before testing.",
        variant: "destructive",
      });
      return;
    }

    testSMTPMutation.mutate({ testEmail });
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

  const handleRefreshLogs = () => {
    queryClient.invalidateQueries({ queryKey: ["email-logs"] });
    queryClient.invalidateQueries({ queryKey: ["email-stats"] });
  };

  const getStatusBadge = (status: 'success' | 'failed') => {
    return status === 'success' ? (
      <Badge variant="default" className="bg-green-100 text-green-800">
        <CheckCircle className="w-3 h-3 mr-1" />
        Success
      </Badge>
    ) : (
      <Badge variant="destructive">
        <AlertCircle className="w-3 h-3 mr-1" />
        Failed
      </Badge>
    );
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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="system" className="flex items-center">
            <Palette className="w-4 h-4 mr-2" />
            System
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center">
            <Mail className="w-4 h-4 mr-2" />
            Email Config
          </TabsTrigger>
          <TabsTrigger value="email-logs" className="flex items-center">
            <Activity className="w-4 h-4 mr-2" />
            Email Logs
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
          <div className="space-y-6">
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
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          value={smtpConfig.password}
                          onChange={(e) => setSMTPConfig({ ...smtpConfig, password: e.target.value })}
                          placeholder="Your email password or app password"
                          required
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                    <h4 className="font-medium text-blue-900 mb-2">Configuration Notes:</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• For Gmail: Use an App Password instead of your regular password</li>
                      <li>• For Office 365: Use your full email address as username</li>
                      <li>• Emails will be sent from: {smtpConfig.fromEmail}</li>
                      <li>• Email notifications are sent when tickets are created or updated</li>
                      <li>• After saving, use the 'Test Email Configuration' section to verify your settings</li>
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

            {/* Test Email Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Send className="w-5 h-5 mr-2" />
                  Test Email Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {currentSMTPConfig?.config ? (
                  <>
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>
                        SMTP configuration is active. You can send a test email to verify it's working correctly.
                      </AlertDescription>
                    </Alert>
                    
                    <div className="flex space-x-4">
                      <div className="flex-1">
                        <Label htmlFor="testEmail">Test Email Address</Label>
                        <Input
                          id="testEmail"
                          type="email"
                          value={testEmail}
                          onChange={(e) => setTestEmail(e.target.value)}
                          placeholder="test@example.com"
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          onClick={handleTestSMTP}
                          disabled={testSMTPMutation.isPending}
                          variant="outline"
                        >
                          {testSMTPMutation.isPending ? (
                            <>
                              <Send className="w-4 h-4 mr-2 animate-pulse" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4 mr-2" />
                              Send Test Email
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No SMTP configuration found. Please configure SMTP settings first to enable email notifications.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="email-logs">
          <div className="space-y-6">
            {/* Email Statistics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Activity className="w-5 h-5 mr-2" />
                    Email Delivery Statistics
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefreshLogs}
                    disabled={emailStatsLoading}
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${emailStatsLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {emailStatsLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-20 bg-gray-200 rounded animate-pulse"></div>
                    ))}
                  </div>
                ) : emailStats ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-blue-600">Total Sent</p>
                          <p className="text-2xl font-bold text-blue-900">{emailStats.totalSent}</p>
                        </div>
                        <Mail className="w-8 h-8 text-blue-500" />
                      </div>
                    </div>
                    
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-red-600">Failed</p>
                          <p className="text-2xl font-bold text-red-900">{emailStats.totalFailed}</p>
                        </div>
                        <AlertCircle className="w-8 h-8 text-red-500" />
                      </div>
                    </div>
                    
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-green-600">Success Rate</p>
                          <p className="text-2xl font-bold text-green-900">{emailStats.successRate}%</p>
                        </div>
                        <CheckCircle className="w-8 h-8 text-green-500" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No email statistics available yet. Send some emails to see statistics.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Email Logs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Recent Email Logs</span>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => clearLogsMutation.mutate(30)}
                      disabled={clearLogsMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Clear Old Logs (30+ days)
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {emailLogsLoading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-16 bg-gray-200 rounded animate-pulse"></div>
                    ))}
                  </div>
                ) : emailLogs?.logs && emailLogs.logs.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ticket ID</TableHead>
                          <TableHead>Recipient</TableHead>
                          <TableHead>Action</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Details</TableHead>
                          <TableHead>Sent At</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {emailLogs.logs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="font-medium">#{log.ticketId}</TableCell>
                            <TableCell>{log.recipientEmail}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{log.action}</Badge>
                            </TableCell>
                            <TableCell>{getStatusBadge(log.status)}</TableCell>
                            <TableCell className="max-w-xs">
                              {log.status === 'success' ? (
                                <div className="text-sm text-green-600">
                                  {log.details?.messageId && (
                                    <div>ID: {log.details.messageId.substring(0, 20)}...</div>
                                  )}
                                  {log.details?.duration && (
                                    <div>Duration: {log.details.duration}ms</div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-sm text-red-600">
                                  {log.details?.error && (
                                    <div className="truncate" title={log.details.error}>
                                      {log.details.error}
                                    </div>
                                  )}
                                  {log.details?.code && (
                                    <div>Code: {log.details.code}</div>
                                  )}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {new Date(log.createdAt).toLocaleDateString()}
                              </div>
                              <div className="text-xs text-gray-500">
                                {new Date(log.createdAt).toLocaleTimeString()}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <Alert>
                    <Mail className="h-4 w-4" />
                    <AlertDescription>
                      No email logs found. Email logs will appear here when emails are sent.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Email Integration Info */}
            <Card>
              <CardHeader>
                <CardTitle>Email Monitoring & Troubleshooting</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                  <h4 className="font-medium text-gray-900 mb-2">How to Monitor Email Delivery:</h4>
                  <div className="text-sm text-gray-700 space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h5 className="font-medium text-gray-800 mb-1">Success Indicators:</h5>
                        <ul className="list-disc list-inside space-y-1 ml-4 text-gray-600">
                          <li>Green "Success" badge in logs</li>
                          <li>Message ID present in details</li>
                          <li>Response time under 10 seconds</li>
                          <li>High success rate percentage</li>
                        </ul>
                      </div>
                      <div>
                        <h5 className="font-medium text-gray-800 mb-1">Failure Indicators:</h5>
                        <ul className="list-disc list-inside space-y-1 ml-4 text-gray-600">
                          <li>Red "Failed" badge in logs</li>
                          <li>Error message in details</li>
                          <li>SMTP error codes (5xx, 4xx)</li>
                          <li>Connection timeout errors</li>
                        </ul>
                      </div>
                    </div>
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                      <p className="text-sm text-blue-800">
                        <strong>Troubleshooting Tips:</strong> Check SMTP credentials, verify server settings, 
                        ensure firewall allows SMTP traffic, and check recipient email validity.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
