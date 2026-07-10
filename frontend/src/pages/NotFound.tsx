import { Link } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';

export function NotFound() {
  return <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center"><AlertCircle className="h-12 w-12 text-primary" /><h1 className="text-3xl font-bold">Página não encontrada</h1><p className="text-muted-foreground">A rota solicitada não existe.</p><Link to="/"><Button>Voltar ao dashboard</Button></Link></div>;
}
