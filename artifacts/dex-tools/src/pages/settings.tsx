import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSettings, ConnectionSettings } from "@/hooks/use-settings";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { ShieldAlert, Save, Trash2, Eye, EyeOff } from "lucide-react";

const settingsSchema = z.object({
  rpcEndpoint: z.string().url("Must be a valid URL").or(z.literal("")),
  privateKey: z.string(),
  apiKey: z.string(),
});

export default function Settings() {
  const { settings, saveSettings, clearSettings, isLoaded } = useSettings();
  const { toast } = useToast();
  const [showPk, setShowPk] = useState(false);
  const [showApi, setShowApi] = useState(false);

  const form = useForm<ConnectionSettings>({
    resolver: zodResolver(settingsSchema),
    values: settings,
  });

  const onSubmit = (values: ConnectionSettings) => {
    const success = saveSettings(values);
    if (success) {
      toast({ 
        title: "Settings saved locally", 
        description: "Credentials are encrypted in your browser storage." 
      });
    } else {
      toast({ 
        title: "Failed to save", 
        description: "An error occurred while encrypting data.", 
        variant: "destructive" 
      });
    }
  };

  const handleClear = () => {
    clearSettings();
    form.reset({ rpcEndpoint: "", privateKey: "", apiKey: "" });
    toast({ title: "Keys removed", description: "Local storage has been cleared." });
  };

  if (!isLoaded) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Connection Settings</h1>
        <p className="text-muted-foreground text-sm">Configure your on-chain connection credentials.</p>
      </div>

      <Alert variant="default" className="bg-chart-4/10 text-chart-4 border-chart-4/20">
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>Security Warning</AlertTitle>
        <AlertDescription>
          These keys are stored <strong>only in your browser's local storage</strong> using AES encryption. 
          They are NEVER sent to our servers. Protect your device and clear these keys when using a public computer.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>API & RPC Configuration</CardTitle>
          <CardDescription>Enter the credentials required to connect to Dango Exchange.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="rpcEndpoint"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>RPC Endpoint</FormLabel>
                    <FormControl>
                      <Input placeholder="https://mainnet.dango.exchange/rpc" {...field} />
                    </FormControl>
                    <FormDescription>Custom node RPC URL (optional)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="privateKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Wallet Private Key</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input 
                          type={showPk ? "text" : "password"} 
                          placeholder="0x..." 
                          {...field} 
                          className="pr-10"
                        />
                      </FormControl>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPk(!showPk)}
                      >
                        {showPk ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <FormDescription>Used to sign rerange transactions locally.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="apiKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dango API Key</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input 
                          type={showApi ? "text" : "password"} 
                          placeholder="dn_..." 
                          {...field} 
                          className="pr-10"
                        />
                      </FormControl>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowApi(!showApi)}
                      >
                        {showApi ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <FormDescription>Required for placing grid orders.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="pt-4 flex items-center justify-between">
                <Button 
                  type="button" 
                  variant="destructive" 
                  onClick={handleClear}
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Clear All Keys
                </Button>
                <Button type="submit" className="gap-2">
                  <Save className="h-4 w-4" />
                  Save Securely
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
