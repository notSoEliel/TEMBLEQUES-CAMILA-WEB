import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { LogIn, Loader2 } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Error al iniciar sesion");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl" style={{ fontFamily: "'Playfair Display', serif" }}>
            Iniciar Sesion
          </CardTitle>
          <CardDescription>Accede a tu cuenta para reservar</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contrasena</Label>
              <Input id="password" type="password" placeholder="Tu contrasena" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>

            {error && (
              <div className="bg-destructive/10 border-2 border-destructive rounded-lg p-3 text-sm text-destructive">{error}</div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <LogIn className="h-4 w-4 mr-2" />}
              Iniciar Sesion
            </Button>
          </form>

          <Separator className="my-6" />

          <p className="text-center text-sm text-muted-foreground">
            No tienes cuenta?{" "}
            <Link to="/register" className="text-primary font-semibold hover:underline">
              Registrate aqui
            </Link>
          </p>

          <div className="mt-4 bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
            <p className="font-bold mb-1">Cuentas de demo:</p>
            <p>Admin: admin@tembleques.com / admin123</p>
            <p>Cliente: cliente@demo.com / demo123</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
