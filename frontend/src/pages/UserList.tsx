import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Calendar, Eye, Mail, Pencil, Search, Trash2, User as UserIcon, UserPlus } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Pagination } from '../components/ui/Pagination';
import { Skeleton } from '../components/ui/Skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { useCreateUser, useDeleteUser, useUpdateUser, useUserDetail, useUsersList } from '../hooks/useUsers';
import { useDebounce } from '../hooks/useDebounce';
import { useToast } from '../context/ToastContext';
import type { User } from '../types';

const userSchema = z.object({
  name: z.string().min(3, 'O nome deve conter pelo menos 3 caracteres').max(100).trim(),
  email: z.string().email('Informe um e-mail válido').trim().toLowerCase(),
});
type UserFormData = z.infer<typeof userSchema>;

export function UserList() {
  const toast = useToast();
  const [searchValue, setSearchValue] = useState('');
  const [page, setPage] = useState(1);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const search = useDebounce(searchValue, 400);
  const { data, isLoading, isError } = useUsersList({ page, limit: 10, sortBy: 'createdAt', sortOrder: 'desc', search });
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();
  const createForm = useForm<UserFormData>({ resolver: zodResolver(userSchema) });
  const editForm = useForm<UserFormData>({ resolver: zodResolver(userSchema) });
  const users = data?.data ?? [];

  async function onCreate(values: UserFormData) {
    try {
      await createUser.mutateAsync(values);
      toast.success('Usuário cadastrado', `O usuário ${values.name} foi registrado com sucesso.`);
      setIsRegisterOpen(false);
      createForm.reset();
    } catch (error) {
      toast.error('Erro ao cadastrar', error instanceof Error ? error.message : 'Falha inesperada.');
    }
  }

  function openEdit(user: User) {
    setEditingUser(user);
    editForm.reset({ name: user.name, email: user.email });
  }

  async function onEdit(values: UserFormData) {
    if (!editingUser) return;
    try {
      await updateUser.mutateAsync({ id: editingUser.id, data: values });
      toast.success('Usuário atualizado', `Os dados de ${values.name} foram atualizados.`);
      setEditingUser(null);
    } catch (error) {
      toast.error('Erro ao atualizar', error instanceof Error ? error.message : 'Falha inesperada.');
    }
  }

  async function onDelete() {
    if (!deletingUser) return;
    try {
      await deleteUser.mutateAsync(deletingUser.id);
      toast.success('Usuário excluído', `${deletingUser.name} foi removido com sucesso.`);
      setDeletingUser(null);
    } catch (error) {
      toast.error('Erro ao excluir', error instanceof Error ? error.message : 'Falha inesperada.');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div><h1 className="text-3xl font-bold">Lista de Usuários</h1><p className="text-sm text-muted-foreground">Visualização, cadastro, edição e exclusão de usuários.</p></div>
        <Button onClick={() => setIsRegisterOpen(true)}><UserPlus className="mr-2 h-4 w-4" />Cadastrar Usuário</Button>
      </div>
      <Card><CardContent className="p-4"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={searchValue} onChange={(event) => { setSearchValue(event.target.value); setPage(1); }} placeholder="Pesquisar pelo nome do usuário..." aria-label="Pesquisar usuários pelo nome" className="h-10 w-full rounded-xl border bg-background pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-ring" /></div></CardContent></Card>
      <Card><CardContent className="p-0">
        <Table><TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>E-mail</TableHead><TableHead>Data de Criação</TableHead><TableHead className="text-center">Ações</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading ? Array.from({ length: 5 }).map((_, index) => <TableRow key={index}><TableCell><Skeleton className="h-5 w-40" /></TableCell><TableCell><Skeleton className="h-5 w-52" /></TableCell><TableCell><Skeleton className="h-5 w-28" /></TableCell><TableCell><Skeleton className="mx-auto h-8 w-24" /></TableCell></TableRow>)
              : isError ? <TableRow><TableCell colSpan={4} className="py-8 text-center text-destructive">Falha ao carregar usuários.</TableCell></TableRow>
                : users.length === 0 ? <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">Nenhum usuário localizado.</TableCell></TableRow>
                  : users.map((user) => <TableRow key={user.id}><TableCell className="font-semibold">{user.name}</TableCell><TableCell>{user.email}</TableCell><TableCell>{new Date(user.createdAt).toLocaleString('pt-BR')}</TableCell><TableCell><div className="flex justify-center gap-1"><Button variant="ghost" size="icon" aria-label={`Visualizar ${user.name}`} onClick={() => setSelectedUserId(user.id)}><Eye className="h-4 w-4" /></Button><Button variant="ghost" size="icon" aria-label={`Editar ${user.name}`} onClick={() => openEdit(user)}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" aria-label={`Excluir ${user.name}`} className="text-destructive hover:text-destructive" onClick={() => setDeletingUser(user)}><Trash2 className="h-4 w-4" /></Button></div></TableCell></TableRow>)}
          </TableBody>
        </Table>
        <Pagination currentPage={page} totalPages={data?.pagination?.pages ?? 1} onPageChange={setPage} isLoading={isLoading} />
      </CardContent></Card>

      <Modal isOpen={isRegisterOpen} onClose={() => setIsRegisterOpen(false)} title="Cadastrar Novo Usuário" footer={<><Button variant="outline" onClick={() => setIsRegisterOpen(false)}>Cancelar</Button><Button onClick={createForm.handleSubmit(onCreate)} isLoading={createUser.isPending}>Salvar Usuário</Button></>}>
        <form className="space-y-4" onSubmit={createForm.handleSubmit(onCreate)}><Input label="Nome Completo" icon={<UserIcon className="h-4 w-4" />} error={createForm.formState.errors.name?.message} {...createForm.register('name')} /><Input label="Endereço de E-mail" type="email" icon={<Mail className="h-4 w-4" />} error={createForm.formState.errors.email?.message} {...createForm.register('email')} /></form>
      </Modal>
      <Modal isOpen={Boolean(editingUser)} onClose={() => setEditingUser(null)} title="Editar Usuário" footer={<><Button variant="outline" onClick={() => setEditingUser(null)}>Cancelar</Button><Button onClick={editForm.handleSubmit(onEdit)} isLoading={updateUser.isPending}>Salvar Alterações</Button></>}>
        <form className="space-y-4" onSubmit={editForm.handleSubmit(onEdit)}><Input label="Nome Completo" icon={<UserIcon className="h-4 w-4" />} error={editForm.formState.errors.name?.message} {...editForm.register('name')} /><Input label="Endereço de E-mail" type="email" icon={<Mail className="h-4 w-4" />} error={editForm.formState.errors.email?.message} {...editForm.register('email')} /></form>
      </Modal>
      <Modal isOpen={Boolean(deletingUser)} onClose={() => setDeletingUser(null)} title="Excluir Usuário" size="sm" footer={<><Button variant="outline" onClick={() => setDeletingUser(null)}>Cancelar</Button><Button variant="destructive" onClick={onDelete} isLoading={deleteUser.isPending}>Excluir</Button></>}>
        <p>Tem certeza de que deseja excluir <strong>{deletingUser?.name}</strong>? Esta ação não pode ser desfeita.</p>
      </Modal>
      {selectedUserId && <UserDetailsModal id={selectedUserId} onClose={() => setSelectedUserId(null)} />}
    </div>
  );
}

function UserDetailsModal({ id, onClose }: { id: string; onClose: () => void }) {
  const { data: user, isLoading } = useUserDetail(id);
  return <Modal isOpen={Boolean(id)} onClose={onClose} title="Detalhes do Usuário">{isLoading || !user ? <Skeleton className="h-24 w-full" /> : <div className="space-y-4"><div className="flex items-center gap-4"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-xl font-bold text-primary">{user.name.slice(0, 2).toUpperCase()}</div><div><h2 className="text-xl font-bold">{user.name}</h2></div></div><p className="flex items-center gap-2"><Mail className="h-4 w-4" />{user.email}</p><p className="flex items-center gap-2"><Calendar className="h-4 w-4" />Criado em {new Date(user.createdAt).toLocaleString('pt-BR')}</p></div>}</Modal>;
}
