-- Permitir SELECT ao próprio usuário
create policy if not exists "profiles_select_own" on public.profiles
for select to authenticated
using (auth.uid() = user_id);

-- Permitir INSERT apenas para service_role OU para o próprio usuário (em flows específicos como onboarding)
create policy if not exists "profiles_insert_service_or_self" on public.profiles
for insert to authenticated
with check (
  (auth.uid() = user_id)
) ;

-- Permitir INSERT para service_role (edge functions)
create policy if not exists "profiles_insert_service_role" on public.profiles
for insert to service_role
with check (true);

-- Permitir UPDATE apenas do próprio registro
create policy if not exists "profiles_update_own" on public.profiles
for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Permitir DELETE apenas do próprio registro (se houver necessidade)
create policy if not exists "profiles_delete_own" on public.profiles
for delete to authenticated
using (auth.uid() = user_id);

-- Nota: evite policies conflitantes; garanta que apenas uma linha se aplique por operação conforme role