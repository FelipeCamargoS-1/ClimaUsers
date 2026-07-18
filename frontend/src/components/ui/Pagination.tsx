import { Button } from './Button';

export function Pagination({ currentPage, totalPages, onPageChange, isLoading }: { currentPage: number; totalPages: number; onPageChange: (page: number) => void; isLoading?: boolean }) {
  return (
    <div className="flex flex-col items-stretch justify-between gap-3 border-t p-4 text-sm sm:flex-row sm:items-center">
      <span className="text-muted-foreground">Página {currentPage} de {Math.max(totalPages, 1)}</span>
      <div className="grid grid-cols-2 gap-2 sm:flex">
        <Button variant="outline" disabled={currentPage <= 1 || isLoading} onClick={() => onPageChange(currentPage - 1)}>Anterior</Button>
        <Button variant="outline" disabled={currentPage >= totalPages || isLoading} onClick={() => onPageChange(currentPage + 1)}>Próxima</Button>
      </div>
    </div>
  );
}
