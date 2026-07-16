import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Moon, ShieldCheck, Sun, UserPlus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const registerSchema = z.object({
  name: z.string().min(3, 'Informe seu nome completo').max(255).trim(),
  email: z.string().email('Informe um e-mail válido').trim().toLowerCase(),
  password: z.string().min(12, 'Use pelo menos 12 caracteres').max(128),
  confirmPassword: z.string().min(12, 'Confirme sua senha'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas precisam ser iguais',
  path: ['confirmPassword'],
});

type RegisterForm = z.infer<typeof registerSchema>;

export function Register() {
  const navigate = useNavigate();
  const auth = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });

  if (auth.isAuthenticated) return <Navigate to="/" replace />;

  async function onSubmit(values: RegisterForm) {
    try {
      setError(null);
      await auth.register({ name: values.name, email: values.email, password: values.password });
      navigate('/', { replace: true });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Falha ao criar conta.');
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#e6f0ff_0,#f7f9fd_40%,#eef3fb_100%)] px-6 py-10 text-[#1b2233] dark:bg-[radial-gradient(circle_at_top_left,#1e2440_0,#0f1424_42%,#0b101b_100%)] dark:text-white">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl overflow-hidden rounded-[34px] border border-white/60 bg-white/90 shadow-[0_30px_90px_rgba(89,110,150,0.18)] backdrop-blur-xl dark:border-white/10 dark:bg-[#101725]/90">
        <section className="hidden w-[44%] flex-col justify-between bg-[linear-gradient(160deg,#1b9aaa_0%,#246bff_48%,#6c3df1_100%)] p-10 text-white lg:flex">
          <div>
            <div className="inline-flex rounded-full bg-white/14 px-4 py-1 text-sm font-medium">Create Account</div>
            <h1 className="mt-8 text-4xl font-semibold leading-tight">Crie sua conta com senha forte e autenticação persistente.</h1>
            <p className="mt-5 max-w-md text-[16px] leading-7 text-white/84">Fluxo de cadastro integrado ao backend com hash de senha, sessão segura e proteção para as rotas privadas do sistema.</p>
          </div>
          <div className="space-y-4">
            <Feature text="Senha validada com mínimo forte" />
            <Feature text="Sessão segura por cookie HttpOnly" />
            <Feature text="Proteção de acesso no frontend e no backend" />
          </div>
        </section>

        <section className="flex flex-1 flex-col justify-between p-8 sm:p-10">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[#7b86a0] dark:text-[#8fa0c2]">Cadastro</div>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em]">Criar nova conta</h2>
            </div>
            <button onClick={toggleTheme} className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#dde5f2] bg-white text-[#5e6a84] shadow-sm dark:border-[#263047] dark:bg-[#131b2b] dark:text-[#cbd5e1]">
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="mx-auto mt-10 w-full max-w-md space-y-5">
            <Input label="Nome" placeholder="Seu nome completo" error={form.formState.errors.name?.message} {...form.register('name')} className="h-12 rounded-2xl px-4 dark:border-[#263047] dark:bg-[#131b2b]" />
            <Input label="E-mail" type="email" placeholder="voce@empresa.com" error={form.formState.errors.email?.message} {...form.register('email')} className="h-12 rounded-2xl px-4 dark:border-[#263047] dark:bg-[#131b2b]" />
            <Input label="Senha" type="password" placeholder="Crie uma senha forte" error={form.formState.errors.password?.message} {...form.register('password')} className="h-12 rounded-2xl px-4 dark:border-[#263047] dark:bg-[#131b2b]" />
            <Input label="Confirmar senha" type="password" placeholder="Repita a senha" error={form.formState.errors.confirmPassword?.message} {...form.register('confirmPassword')} className="h-12 rounded-2xl px-4 dark:border-[#263047] dark:bg-[#131b2b]" />
            {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">{error}</div> : null}
            <Button type="submit" isLoading={form.formState.isSubmitting} className="h-12 w-full rounded-2xl bg-[linear-gradient(135deg,#246bff_0%,#6c3df1_100%)] text-white shadow-[0_18px_35px_rgba(79,124,255,0.25)]">
              <UserPlus className="mr-2 h-4 w-4" />
              Criar conta
            </Button>
          </form>

          <div className="mx-auto mt-8 flex w-full max-w-md items-center justify-between text-sm text-[#64718b] dark:text-[#94a3b8]">
            <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[#16a34a]" /> Cadastro protegido</div>
            <Link to="/login" className="font-semibold text-[#6c3df1] dark:text-[#9db4ff]">Já tenho conta</Link>
          </div>
        </section>
      </div>
    </div>
  );
}

function Feature({ text }: { text: string }) {
  return <div className="rounded-2xl border border-white/18 bg-white/10 px-4 py-4 text-sm font-medium text-white/92 backdrop-blur-sm">{text}</div>;
}
