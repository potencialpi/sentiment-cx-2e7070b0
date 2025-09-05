-- Migração para adicionar função log_audit_action
-- Esta função é necessária para resolver o erro nos Magic Links
-- Data: 2025-01-21
-- Prioridade: ALTA - Funcionalidade crítica

-- Função simplificada para registrar ações de auditoria
-- Esta versão resolve o erro dos Magic Links sem criar a tabela completa

-- Função unificada que aceita todos os formatos de parâmetros
CREATE OR REPLACE FUNCTION log_audit_action(
    p_action VARCHAR(100) DEFAULT NULL,
    p_table_name VARCHAR(50) DEFAULT NULL,
    p_record_id UUID DEFAULT NULL,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL,
    p_details JSONB DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_old_data JSONB DEFAULT NULL,
    p_new_data JSONB DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    audit_id UUID;
    final_action VARCHAR(100);
    final_table VARCHAR(50);
    final_old_data JSONB;
    final_new_data JSONB;
    final_user_id UUID;
BEGIN
    -- Gerar um UUID para retorno (simulando inserção)
    audit_id := gen_random_uuid();
    
    -- Normalizar parâmetros (aceitar ambos os formatos)
    final_action := COALESCE(p_action, 'UNKNOWN_ACTION');
    final_table := COALESCE(p_table_name, 'unknown_table');
    final_old_data := COALESCE(p_old_values, p_old_data);
    final_new_data := COALESCE(p_new_values, p_new_data);
    final_user_id := COALESCE(p_user_id, auth.uid());
    
    -- Log simples no console do PostgreSQL para debug
    RAISE NOTICE 'AUDIT: % on % (ID: %) by % from % - Details: %', 
        final_action, final_table, p_record_id, 
        COALESCE(final_user_id::text, 'anonymous'), p_ip_address, p_details;
    
    -- Retornar o UUID gerado
    RETURN audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentário explicativo
COMMENT ON FUNCTION log_audit_action IS 'Função temporária para resolver erro dos Magic Links - registra apenas no log do PostgreSQL';

-- Conceder permissões necessárias
GRANT EXECUTE ON FUNCTION log_audit_action TO authenticated;
GRANT EXECUTE ON FUNCTION log_audit_action TO anon;
GRANT EXECUTE ON FUNCTION log_audit_action TO service_role;

-- Log da migração
INSERT INTO public.migration_log (migration_name, applied_at, description)
VALUES (
    '20250121000002_add_log_audit_action_function',
    NOW(),
    'Adicionada função log_audit_action para resolver erro nos Magic Links'
) ON CONFLICT (migration_name) DO NOTHING;

-- Comentários na migração
COMMENT ON FUNCTION log_audit_action IS 'Função de auditoria simplificada - resolve erro ERR_FAILED nos Magic Links';