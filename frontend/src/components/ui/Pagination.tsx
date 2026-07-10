import { Button } from './Button';

export function Pagination({ currentPage, totalPages, onPageChange, isLoading }: { currentPage: number; totalPages: number; onPageChange: (page: number) => void; isLoading?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t p-4 text-sm">
      <span className="text-muted-foreground">Página {currentPage} de {Math.max(totalPages, 1)}</span>
      <div className="flex gap-2">
        <Button variant="outline" disabled={currentPage <= 1 || isLoading} onClick={() => onPageChange(currentPage - 1)}>Anterior</Button>
        <Button variant="outline" disabled={currentPage >= totalPages || isLoading} onClick={() => onPageChange(currentPage + 1)}>Próxima</Button>
      </div>
    </div>
  );
}
