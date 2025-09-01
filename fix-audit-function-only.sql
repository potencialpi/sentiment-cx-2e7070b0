-- Função simplificada para registrar ações de auditoria
-- Esta versão resolve o erro dos Magic Links sem criar a tabela completa

CREATE OR REPLACE FUNCTION log_audit_action(
    p_action VARCHAR(100),
    p_table_name VARCHAR(50),
    p_record_id UUID DEFAULT NULL,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL,
    p_details JSONB DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    audit_id UUID;
BEGIN
    -- Gerar um UUID para retorno (simulando inserção)
    audit_id := gen_random_uuid();
    
    -- Log simples no console do PostgreSQL para debug
    RAISE NOTICE 'AUDIT: % on % (ID: %) by % from %', 
        p_action, p_table_name, p_record_id, 
        COALESCE(auth.uid()::text, 'anonymous'), p_ip_address;
    
    -- Retornar o UUID gerado
    RETURN audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentário explicativo
COMMENT ON FUNCTION log_audit_action IS 'Função temporária para resolver erro dos Magic Links - registra apenas no log do PostgreSQL';