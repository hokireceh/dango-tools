import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSettings, ConnectionSettings } from "@/hooks/use-settings";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { ShieldAlert, Save, Trash2, Info } from "lucide-react";
import { SessionKeySetup } from "@/components/session-key-setup";

const settingsSchema = z.object({
  rpcEndpoint: z.string().url("Must be a valid URL").or(z.literal("")),
});

export default function Settings() {
  const { settings, saveSettings, clearSettings, isLoaded } = useSettings();
  const { toast } = useToast();

  const form = useForm<ConnectionSettings>({
    resolver: zodResolver(settingsSchema),
    values: settings,
  });

  const onSubmit = (values: ConnectionSettings) => {
    const success = saveSettings(values);
    if (success) {
      toast({
        title: "Settings saved",
        description: "Disimpan di browser storage (obfuscated, bukan enkripsi aman).",
      });
    } else {
      toast({
        title: "Failed to save",
        description: "An error occurred while saving data.",
        variant: "destructive",
      });
    }
  };

  const handleClear = () => {
    clearSettings();
    form.reset({ rpcEndpoint: "" });
    toast({ title: "Settings cleared", description: "Local storage has been cleared." });
  };

  if (!isLoaded) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Connection Settings</h1>
        <p className="text-muted-foreground text-sm">Configure your connection to Dango Exchange.</p>
      </div>

      <Alert variant="default" className="bg-chart-3/10 text-chart-3 border-chart-3/20">
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>Peringatan Keamanan</AlertTitle>
        <AlertDescription>
          Data disimpan <strong>hanya di browser lokal kamu</strong> dalam format obfuscated —{" "}
          <strong>bukan enkripsi aman</strong>. Jangan gunakan di perangkat publik atau bersama.
        </AlertDescription>
      </Alert>

      <Alert variant="default" className="bg-primary/5 border-primary/20">
        <Info className="h-4 w-4 text-primary" />
        <AlertTitle className="text-primary">Tentang Autentikasi Dango</AlertTitle>
        <AlertDescription className="text-muted-foreground">
          Dango Exchange menggunakan sistem <strong>passkey / biometrik</strong> — bukan private key EVM.
          Input private key tidak didukung dan telah dihapus karena berpotensi menyesatkan dan berbahaya.
          Signing transaksi akan dilakukan melalui passkey browser saat integrasi on-chain tersedia.
        </AlertDescription>
      </Alert>

      <SessionKeySetup />

      <Card>
        <CardHeader>
          <CardTitle>RPC Configuration</CardTitle>
          <CardDescription>Custom RPC node untuk koneksi ke jaringan Dango (opsional).</CardDescription>
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
                    <FormDescription>Kosongkan untuk menggunakan node default.</FormDescription>
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
                  Clear Settings
                </Button>
                <Button type="submit" className="gap-2">
                  <Save className="h-4 w-4" />
                  Save
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
